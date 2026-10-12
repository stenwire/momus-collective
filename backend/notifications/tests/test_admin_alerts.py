import base64
import io

import pytest
import requests
from django.core import mail
from django.core.exceptions import ImproperlyConfigured
from django.core.mail import EmailMessage
from PIL import Image
from rest_framework.test import APIClient

from accounts.models import User
from carts.models import SavedDesign
from carts.services import add_line, user_cart
from config.email import ResendEmailBackend
from designs.tests.test_saved_designs import CONFIG
from notifications import whatsapp
from notifications.models import Notification
from orders.tasks import order_paid
from orders.tests.test_fulfilment import SHIPPING, client_for, guest_start, start

pytestmark = pytest.mark.django_db


@pytest.fixture
def staff():
    return User.objects.create_user(
        email="owner@example.com",
        password="correct-horse-battery",
        first_name="O",
        phone="1",
        is_staff=True,
    )


class Recorder:
    def __init__(self, status=200):
        self.status, self.calls = status, []

    def __call__(self, method, url, timeout, **kwargs):
        self.calls.append({"method": method, "url": url, **kwargs})
        return type("Resp", (), {"status_code": self.status})()


@pytest.fixture
def wa(monkeypatch, settings):
    settings.WHATSAPP_PROVIDER = ""
    settings.TERMII_API_KEY = ""
    settings.TERMII_SENDER_ID = ""
    settings.CALLMEBOT_API_KEY = "cmb-key"
    settings.ADMIN_WHATSAPP_NUMBER = "+2348011111111"
    recorder = Recorder()
    monkeypatch.setattr(requests, "request", recorder)
    return recorder


def admin_mail():
    return [m for m in mail.outbox if m.subject.startswith("New order")]


def test_a_paid_order_emails_every_active_staff_member(product, staff, paid, wa):
    User.objects.create_user(
        email="former@example.com",
        password="x" * 12,
        phone="1",
        is_staff=True,
        is_active=False,
    )
    order = paid(guest_start(product, shipping={**SHIPPING, "notes": "Gate 4421"}))
    [email] = admin_mail()
    assert email.to == ["owner@example.com"]
    assert email.subject == f"New order {order.order_number}: ₦23,000"
    html = email.alternatives[0][0]
    for body in (email.body, html):
        for expected in (
            "Ada Lovelace",
            "+2348000000000",
            "guest@example.com",
            "touch grass",
            "12 Admiralty Way",
            "Eti-Osa",
            "Gate 4421",
            "₦23,000",
            order.paystack_reference,
            f"/admin/orders/{order.id}",
        ):
            assert expected in body, expected
    assert email.attachments == []


def test_custom_design_print_files_are_attached(user, staff, paid, wa):
    design = SavedDesign.objects.create(user=user, name="mine", config=CONFIG)
    add_line(user_cart(user), saved_design=design, size="L", color="", quantity=1)
    order = paid(start(client_for(user)))
    [email] = admin_mail()
    [(filename, content, mimetype)] = email.attachments
    assert filename == f"{order.order_number}-item1-L.png"
    assert mimetype == "image/png"
    image = Image.open(io.BytesIO(content))
    assert round(image.info["dpi"][0]) == 300
    assert image.mode == "RGBA"


def test_the_admin_bot_sends_the_whatsapp_summary(product, staff, paid, wa):
    order = paid(guest_start(product))
    [call] = wa.calls
    assert call["method"] == "GET"
    assert call["url"] == "https://api.callmebot.com/whatsapp.php"
    params = call["params"]
    assert params["phone"] == "+2348011111111" and params["apikey"] == "cmb-key"
    text = params["text"]
    assert text.startswith(f"New order {order.order_number}: ₦23,000 paid")
    # A free relay gets no customer details (D-093, finding 6).
    for private in ("Ada Lovelace", "+2348000000000", "Admiralty", "Eti-Osa"):
        assert private not in text
    assert "Customer and address are in the order email." in text
    assert "- 2x touch grass (M)" in text
    assert f"/admin/orders/{order.id}" in text


def test_termii_is_chosen_automatically_once_keyed(product, staff, paid, wa, settings):
    settings.TERMII_API_KEY = "termii-key"
    settings.TERMII_SENDER_ID = "Momus"
    paid(guest_start(product))
    [call] = wa.calls
    assert call["method"] == "POST"
    assert call["url"] == "https://api.ng.termii.com/api/sms/send"
    body = call["json"]
    assert (body["channel"], body["to"], body["from"], body["api_key"]) == (
        "whatsapp",
        "2348011111111",
        "Momus",
        "termii-key",
    )
    # Termii is a business API with a data agreement: the full summary.
    assert "Ada Lovelace, +2348000000000" in body["sms"]
    assert "Ship to: 12 Admiralty Way, Lekki, Eti-Osa, Lagos" in body["sms"]


def test_the_env_variable_overrides_the_automatic_choice(wa, settings):
    settings.TERMII_API_KEY = "termii-key"
    settings.WHATSAPP_PROVIDER = "admin_bot"
    assert isinstance(whatsapp.provider(), whatsapp.AdminBot)
    settings.WHATSAPP_PROVIDER = ""
    assert isinstance(whatsapp.provider(), whatsapp.Termii)
    settings.TERMII_API_KEY = ""
    assert isinstance(whatsapp.provider(), whatsapp.AdminBot)
    settings.WHATSAPP_PROVIDER = "carrier-pigeon"
    with pytest.raises(ImproperlyConfigured):
        whatsapp.provider()


def test_only_termii_can_message_customers():
    assert whatsapp.Termii.can_message_customers is True
    assert whatsapp.AdminBot.can_message_customers is False


def test_an_unconfigured_provider_sends_nothing(product, staff, paid, wa, settings):
    settings.CALLMEBOT_API_KEY = ""
    order = paid(guest_start(product))
    assert wa.calls == []
    assert len(admin_mail()) == 1
    assert list(order.notifications.values_list("channel", flat=True)) == ["email"]


def test_reruns_never_alert_twice(product, staff, paid, wa):
    order = paid(guest_start(product))
    order_paid(str(order.id))
    order_paid(str(order.id))
    assert len(admin_mail()) == 1
    assert len(wa.calls) == 1


def test_a_whatsapp_failure_retries_without_resending_the_email(
    product, staff, paid, wa, monkeypatch
):
    down = Recorder(status=503)
    monkeypatch.setattr(requests, "request", down)
    # The failure schedules a Celery retry; the confirmed payment stands.
    order = paid(guest_start(product))
    assert len(down.calls) == 1
    assert list(order.notifications.values_list("channel", flat=True)) == ["email"]
    monkeypatch.setattr(requests, "request", wa)
    order_paid(str(order.id))
    assert len(admin_mail()) == 1
    assert len(wa.calls) == 1
    assert order.notifications.count() == 2


def test_notifications_record_no_recipient_or_text():
    fields = {f.name for f in Notification._meta.get_fields()}
    assert fields == {"id", "order", "kind", "channel", "sent_at"}


def test_resend_backend_sends_attachments_base64(monkeypatch, settings):
    calls = []

    def post(url, json, headers, timeout):
        calls.append(json)
        return type("Resp", (), {"status_code": 200})()

    monkeypatch.setattr(requests, "post", post)
    msg = EmailMessage("S", "B", "shop@example.com", ["a@example.com"])
    msg.attach("file.png", b"\x89PNG-bytes", "image/png")
    ResendEmailBackend().send_messages([msg])
    assert calls[0]["attachments"] == [
        {"filename": "file.png", "content": base64.b64encode(b"\x89PNG-bytes").decode()}
    ]


def test_a_passed_on_fee_is_shown_to_the_admin(
    product, staff, monkeypatch, wa, django_capture_on_commit_callbacks
):
    from orders import paystack
    from orders.models import Order

    body = guest_start(product)
    monkeypatch.setattr(
        paystack,
        "verify_transaction",
        lambda ref: {
            "status": "success",
            "currency": "NGN",
            "amount": body["amount"] + 52031,
            "requested_amount": body["amount"],
        },
    )
    with django_capture_on_commit_callbacks(execute=True):
        APIClient().post(
            "/api/v1/checkout/verify/", {"reference": body["reference"]}, format="json"
        )
    order = Order.objects.get(paystack_reference=body["reference"])
    [email] = admin_mail()
    assert email.subject == f"New order {order.order_number}: ₦23,520.31"
    assert "Order total: ₦23,000" in email.body
    assert "Paystack fee (paid by the customer): ₦520.31" in email.body
    assert "Total paid: ₦23,520.31" in email.body
    assert wa.calls[0]["params"]["text"].startswith(
        f"New order {order.order_number}: ₦23,520.31 paid"
    )
    detail = (
        client_for(User.objects.get(email="owner@example.com"))
        .get(f"/api/v1/admin/orders/{order.id}/")
        .json()
    )
    assert (detail["payment"]["payment_fee"], detail["payment"]["amount_paid"]) == (
        52031,
        2352031,
    )
