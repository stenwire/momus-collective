import pytest
import requests
from django.core import mail

from accounts.models import User
from notifications.tasks import status_update
from orders.models import Order
from orders.tests.test_admin_board import make
from orders.tests.test_fulfilment import client_for

pytestmark = pytest.mark.django_db


@pytest.fixture
def staff():
    return User.objects.create_user(
        email="owner@example.com", password="x" * 12, phone="1", is_staff=True
    )


@pytest.fixture
def run(django_capture_on_commit_callbacks):
    def go(fn):
        with django_capture_on_commit_callbacks(execute=True):
            return fn()

    return go


class Recorder:
    def __init__(self):
        self.calls = []

    def __call__(self, method, url, timeout, **kwargs):
        self.calls.append({"method": method, "url": url, **kwargs})
        return type("Resp", (), {"status_code": 200})()


@pytest.fixture
def wa(monkeypatch, settings):
    settings.WHATSAPP_PROVIDER = ""
    settings.TERMII_API_KEY = ""
    settings.TERMII_SENDER_ID = ""
    settings.CALLMEBOT_API_KEY = ""
    settings.ADMIN_WHATSAPP_NUMBER = ""
    recorder = Recorder()
    monkeypatch.setattr(requests, "request", recorder)
    return recorder


def termii(settings):
    settings.TERMII_API_KEY = "termii-key"
    settings.TERMII_SENDER_ID = "Momus"


def move(staff, order, status):
    return client_for(staff).patch(
        f"/api/v1/admin/orders/{order.id}/status/", {"status": status}, format="json"
    )


def updates(order):
    return [
        m for m in mail.outbox if m.subject.startswith(f"Order {order.order_number}")
    ]


def customer_order(n, pref, phone="+2348022222222"):
    user = User.objects.create_user(
        email=f"c{n}@example.com",
        password="x" * 12,
        phone=phone,
        notification_pref=pref,
    )
    order = make(n)
    Order.objects.filter(pk=order.pk).update(user=user, guest_email="", guest_phone="")
    order.refresh_from_db()
    return order


def test_a_status_change_emails_the_customer(staff, run, wa):
    order = make(1)
    run(lambda: move(staff, order, "printed"))
    [email] = updates(order)
    assert email.to == ["g@example.com"]
    assert email.subject == f"Order {order.order_number}: Printed"
    assert "Your shirt is printed and being packed for delivery." in email.body
    assert f"/track/{order.tracking_token}" in email.body
    assert wa.calls == []


@pytest.mark.parametrize(
    "status,words",
    [
        ("shirt_acquired", "on its way to the printer"),
        ("out_for_delivery", "out for delivery"),
        ("delivered", "has been delivered"),
        ("cancelled", "has been cancelled"),
    ],
)
def test_each_column_has_its_own_message(staff, run, wa, status, words):
    order = make(1)
    run(lambda: move(staff, order, status))
    [email] = updates(order)
    assert words in email.body


def test_moving_back_to_paid_is_a_correction_not_news(staff, run, wa):
    order = make(1, "printed")
    run(lambda: move(staff, order, "paid"))
    assert updates(order) == []


def test_the_update_waits_out_a_grace_period(staff, run, wa, monkeypatch):
    queued = []
    monkeypatch.setattr(
        status_update,
        "apply_async",
        lambda args, countdown: queued.append((args, countdown)),
    )
    order = make(1)
    run(lambda: move(staff, order, "printed"))
    assert queued == [((str(order.id), 1), 60)]


def test_a_change_undone_within_the_grace_period_says_nothing(
    staff, run, wa, monkeypatch
):
    queued = []
    monkeypatch.setattr(
        status_update, "apply_async", lambda args, countdown: queued.append(args)
    )
    order = make(1)
    run(lambda: move(staff, order, "cancelled"))
    run(lambda: move(staff, order, "printed"))
    for args in queued:
        status_update(*args)
    [email] = updates(order)
    assert email.subject.endswith(": Printed")


def test_whatsapp_preference_with_termii_sends_whatsapp_only(staff, run, wa, settings):
    termii(settings)
    order = customer_order(1, "whatsapp")
    run(lambda: move(staff, order, "out_for_delivery"))
    assert updates(order) == []
    [call] = wa.calls
    body = call["json"]
    assert (body["channel"], body["to"]) == ("whatsapp", "2348022222222")
    assert f"order {order.order_number} is now Out for Delivery" in body["sms"]
    assert f"/track/{order.tracking_token}" in body["sms"]


def test_both_sends_email_and_whatsapp(staff, run, wa, settings):
    termii(settings)
    order = customer_order(1, "both")
    run(lambda: move(staff, order, "printed"))
    assert len(updates(order)) == 1 and len(wa.calls) == 1


def test_whatsapp_preference_falls_back_to_email_without_a_customer_provider(
    staff, run, wa, settings
):
    settings.CALLMEBOT_API_KEY = "cmb"
    settings.ADMIN_WHATSAPP_NUMBER = "+2348011111111"
    order = customer_order(1, "whatsapp")
    run(lambda: move(staff, order, "printed"))
    assert [m.to for m in updates(order)] == [["c1@example.com"]]
    assert wa.calls == []


def test_an_update_is_sent_once(staff, run, wa):
    order = make(1)
    run(lambda: move(staff, order, "printed"))
    order.refresh_from_db()
    status_update(str(order.id), len(order.status_history) - 1)
    assert len(updates(order)) == 1


def test_mark_refunded_tells_the_customer(staff, run, wa):
    order = make(1, "moderation", custom=True)
    client = client_for(staff)
    run(
        lambda: client.post(
            f"/api/v1/admin/moderation/{order.id}/reject/", {"reason": "offensive"}
        )
    )
    run(lambda: client.post(f"/api/v1/admin/moderation/{order.id}/refunded/"))
    [email] = updates(order)
    assert email.subject.endswith(": Refunded")
    assert "We've refunded your payment" in email.body


def test_approval_sends_its_own_message_not_a_status_update(staff, run, wa):
    order = make(1, "moderation", custom=True)
    run(lambda: client_for(staff).post(f"/api/v1/admin/moderation/{order.id}/approve/"))
    assert updates(order) == []
    assert [m.subject for m in mail.outbox] == [
        f"Your design is approved: order {order.order_number}"
    ]
