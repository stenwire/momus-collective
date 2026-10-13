import pytest
from django.core import mail
from rest_framework.test import APIClient

from config.money import naira
from orders import paystack
from orders.models import CheckoutSession, Order
from orders.tasks import settle_charge
from orders.tests.test_fulfilment import (  # noqa: F401 (keys is a fixture)
    guest_start,
    keys,
)

pytestmark = pytest.mark.django_db
TOTAL = 2300000  # 2 x touch grass + Eti-Osa delivery
FEE = 52031


def verify_with(monkeypatch, start_body, django_capture_on_commit_callbacks, **data):
    monkeypatch.setattr(
        paystack,
        "verify_transaction",
        lambda ref: {"status": "success", "currency": "NGN", **data},
    )
    with django_capture_on_commit_callbacks(execute=True):
        return APIClient().post(
            "/api/v1/checkout/verify/",
            {"reference": start_body["reference"]},
            format="json",
        )


def test_a_fee_passed_to_the_customer_is_accepted_and_recorded(
    product, monkeypatch, django_capture_on_commit_callbacks
):
    body = guest_start(product)
    resp = verify_with(
        monkeypatch,
        body,
        django_capture_on_commit_callbacks,
        amount=TOTAL + FEE,
        requested_amount=TOTAL,
    )
    assert resp.status_code == 200
    order = Order.objects.get(paystack_reference=body["reference"])
    assert (order.total, order.payment_fee) == (TOTAL, FEE)
    data = APIClient().get(f"/api/v1/orders/track/{order.tracking_token}/").json()
    assert (data["total"], data["payment_fee"], data["amount_paid"]) == (
        TOTAL,
        FEE,
        TOTAL + FEE,
    )
    [email] = mail.outbox
    assert "Order total: ₦23,000" in email.body
    assert "Paystack fee: ₦520.31" in email.body
    assert "Total paid: ₦23,520.31" in email.body


def test_without_a_fee_the_total_is_what_was_paid(
    product, monkeypatch, django_capture_on_commit_callbacks
):
    body = guest_start(product)
    assert (
        verify_with(
            monkeypatch, body, django_capture_on_commit_callbacks, amount=TOTAL
        ).status_code
        == 200
    )
    order = Order.objects.get(paystack_reference=body["reference"])
    assert order.payment_fee == 0
    assert "Paystack fee" not in mail.outbox[0].body
    assert "Total paid: ₦23,000" in mail.outbox[0].body


@pytest.mark.parametrize(
    "amounts",
    [
        {"amount": TOTAL + FEE, "requested_amount": TOTAL - 1},
        {"amount": TOTAL - 1, "requested_amount": TOTAL},
        {"amount": TOTAL + FEE},
        {"amount": "2300000", "requested_amount": TOTAL},
    ],
)
def test_anything_but_our_total_plus_a_fee_is_refused(
    product, monkeypatch, django_capture_on_commit_callbacks, amounts
):
    body = guest_start(product)
    resp = verify_with(monkeypatch, body, django_capture_on_commit_callbacks, **amounts)
    assert resp.status_code == 409
    assert CheckoutSession.objects.get(reference=body["reference"]).status == "pending"
    assert not Order.objects.exists()


def test_a_webhook_without_requested_amount_asks_paystack(product, monkeypatch):
    body = guest_start(product)
    asked = []

    def fake(ref):
        asked.append(ref)
        return {
            "status": "success",
            "currency": "NGN",
            "amount": TOTAL + FEE,
            "requested_amount": TOTAL,
        }

    monkeypatch.setattr(paystack, "verify_transaction", fake)
    settle_charge(
        {
            "reference": body["reference"],
            "status": "success",
            "amount": TOTAL + FEE,
            "currency": "NGN",
        }
    )
    assert asked == [body["reference"]]
    session = CheckoutSession.objects.get(reference=body["reference"])
    assert (session.status, session.payment_fee) == ("paid", FEE)


def test_naira_shows_kobo_only_when_there_are_some():
    assert naira(2300000) == "₦23,000"
    assert naira(FEE) == "₦520.31"
    assert naira(5) == "₦0.05"
