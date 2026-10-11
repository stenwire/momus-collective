import io

import pytest
import requests
from django.core import mail
from django.core.mail import EmailMultiAlternatives
from PIL import Image
from rest_framework.test import APIClient

from carts.models import SavedDesign
from carts.services import add_line, user_cart
from config.email import EmailNotSent, ResendEmailBackend
from designs.tests.test_saved_designs import CONFIG
from orders.models import Order
from orders.tasks import order_paid, send_order_confirmation
from orders.tests.test_fulfilment import (  # noqa: F401 (keys is a fixture)
    SHIPPING,
    client_for,
    guest_start,
    keys,
    pay,
    start,
    webhook,
)

pytestmark = pytest.mark.django_db


@pytest.fixture
def paid(monkeypatch, django_capture_on_commit_callbacks):
    def run(start_body):
        with django_capture_on_commit_callbacks(execute=True):
            pay(monkeypatch, start_body)
        return Order.objects.get(paystack_reference=start_body["reference"])

    return run


def test_a_paid_guest_order_emails_its_confirmation(product, paid):
    order = paid(guest_start(product))
    [email] = mail.outbox
    assert email.to == ["guest@example.com"]
    assert email.subject == f"Your momus collective order {order.order_number}"
    html = email.alternatives[0][0]
    for body in (email.body, html):
        assert order.order_number in body
        assert "touch grass" in body
        assert "₦20,000" in body and "₦23,000" in body
        assert "12 Admiralty Way" in body and "Eti-Osa, Lagos" in body
        assert f"/track/{order.tracking_token}" in body
        assert "Estimated delivery" in body
    order.refresh_from_db()
    assert order.confirmation_sent_at is not None


def test_a_customers_confirmation_goes_to_their_account_email(product, user, paid):
    add_line(user_cart(user), product=product, size="M", color="", quantity=1)
    paid(start(client_for(user)))
    assert [m.to for m in mail.outbox] == [["ada@example.com"]]


def test_replays_and_reverifies_send_no_second_email(product, paid, monkeypatch):
    body = guest_start(product)
    paid(body)
    webhook(body["reference"], body["amount"])
    pay(monkeypatch, body)
    order_paid(str(Order.objects.get(paystack_reference=body["reference"]).id))
    assert len(mail.outbox) == 1


def test_a_failed_send_is_retried_and_then_sent_once(product, paid, settings):
    order = paid(guest_start(product))
    mail.outbox.clear()
    Order.objects.filter(id=order.id).update(confirmation_sent_at=None)
    order.refresh_from_db()

    settings.EMAIL_BACKEND = "orders.tests.test_confirmation.DownBackend"
    with pytest.raises(EmailNotSent):
        send_order_confirmation(order)
    order.refresh_from_db()
    assert order.confirmation_sent_at is None

    settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
    order_paid(str(order.id))
    order_paid(str(order.id))
    assert len(mail.outbox) == 1


class DownBackend(ResendEmailBackend):
    def _send(self, message):
        raise EmailNotSent("down")


def test_the_email_escapes_customer_text(product, monkeypatch, paid):
    body = guest_start(product, shipping={**SHIPPING, "full_name": "<b>Ada</b> & co"})
    paid(body)
    html = mail.outbox[0].alternatives[0][0]
    assert "<b>Ada</b>" not in html
    assert "&lt;b&gt;Ada&lt;/b&gt; &amp; co" in html


def design_order(user, paid):
    design = SavedDesign.objects.create(user=user, name="mine", config=CONFIG)
    add_line(user_cart(user), saved_design=design, size="L", color="", quantity=1)
    order = paid(start(client_for(user)))
    return order, order.items.get()


def test_a_design_line_has_a_thumbnail_behind_the_tracking_token(user, paid):
    order, item = design_order(user, paid)
    url = f"/api/v1/orders/track/{order.tracking_token}/items/{item.id}/preview/"
    assert f"http://api.test{url}" in mail.outbox[0].alternatives[0][0]
    resp = APIClient().get(url)
    assert resp.status_code == 200 and resp["Content-Type"] == "image/png"
    image = Image.open(io.BytesIO(b"".join(resp.streaming_content)))
    assert image.size == (240, 240)
    assert image.getpixel((2, 2)) == (11, 11, 12)  # the Black shirt colour


def test_a_thumbnail_needs_its_own_orders_token(user, product, paid):
    order, item = design_order(user, paid)
    other = paid(guest_start(product))
    client = APIClient()
    base = "/api/v1/orders/track"
    assert (
        client.get(
            f"{base}/{other.tracking_token}/items/{item.id}/preview/"
        ).status_code
        == 404
    )
    assert client.get(f"{base}/nope/items/{item.id}/preview/").status_code == 404
    assert (
        client.get(f"{base}/{order.order_number}/items/{item.id}/preview/").status_code
        == 404
    )


class Recorder:
    def __init__(self, status=200):
        self.status, self.calls = status, []

    def __call__(self, url, json, headers, timeout):
        self.calls.append({"url": url, "json": json, "headers": headers})
        return type("Resp", (), {"status_code": self.status})()


def message():
    msg = EmailMultiAlternatives(
        "Subject", "Plain", "shop@example.com", ["buyer@example.com"]
    )
    msg.attach_alternative("<p>Rich</p>", "text/html")
    return msg


def test_resend_backend_posts_the_message_with_the_key(monkeypatch, settings):
    settings.RESEND_API_KEY = "re_test_key"
    recorder = Recorder()
    monkeypatch.setattr(requests, "post", recorder)
    assert ResendEmailBackend().send_messages([message()]) == 1
    [call] = recorder.calls
    assert call["url"] == "https://api.resend.com/emails"
    assert call["headers"] == {"Authorization": "Bearer re_test_key"}
    assert call["json"] == {
        "from": "shop@example.com",
        "to": ["buyer@example.com"],
        "subject": "Subject",
        "text": "Plain",
        "html": "<p>Rich</p>",
    }


def test_resend_backend_raises_on_refusal_unless_silent(monkeypatch):
    monkeypatch.setattr(requests, "post", Recorder(status=422))
    with pytest.raises(EmailNotSent):
        ResendEmailBackend().send_messages([message()])
    assert ResendEmailBackend(fail_silently=True).send_messages([message()]) == 0


def test_resend_backend_raises_when_unreachable(monkeypatch):
    def down(*args, **kwargs):
        raise requests.ConnectionError

    monkeypatch.setattr(requests, "post", down)
    with pytest.raises(EmailNotSent):
        ResendEmailBackend().send_messages([message()])


@pytest.mark.django_db(transaction=True)
def test_a_broker_outage_never_fails_a_confirmed_payment(product, monkeypatch):
    from importlib import import_module

    from django.apps import apps

    from orders import tasks

    # An earlier transactional test's flush removes the seeded row.
    import_module("orders.migrations.0004_seed_delivery_settings").seed(apps, None)

    def broker_down(*args, **kwargs):
        raise ConnectionError("broker down")

    monkeypatch.setattr(tasks.order_paid, "delay", broker_down)
    body = guest_start(product)
    resp = pay(monkeypatch, body)
    assert resp.status_code == 200
    assert resp.json()["order_number"]
    assert Order.objects.filter(paystack_reference=body["reference"]).exists()
