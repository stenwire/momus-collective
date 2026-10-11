import pytest
import requests
from rest_framework.test import APIClient

from catalog.models import Category, Product
from orders import paystack
from orders.models import CheckoutSession

pytestmark = pytest.mark.django_db

SHIPPING = {
    "full_name": "Ada Lovelace",
    "phone": "+2348000000000",
    "address_line_1": "12 Admiralty Way",
    "city": "Lekki",
    "state": "Lagos",
    "lga": "Eti-Osa",
}


@pytest.fixture(autouse=True)
def keys(settings):
    settings.PAYSTACK_SECRET_KEY = "sk_test_local"
    settings.PAYSTACK_PUBLIC_KEY = "pk_test_local"


@pytest.fixture
def product():
    category = Category.objects.create(name="Test Category", slug="test-category")
    return Product.objects.create(
        slogan="touch grass", slug="tg", category=category, price=1000000
    )


def start(product, **overrides):
    body = {
        "items": [
            {"product": str(product.id), "size": "M", "color": "", "quantity": 2}
        ],
        "shipping": SHIPPING,
        "email": "guest@example.com",
        **overrides,
    }
    return APIClient().post("/api/v1/checkout/", body, format="json")


def verify(reference):
    return APIClient().post(
        "/api/v1/checkout/verify/", {"reference": reference}, format="json"
    )


def paystack_says(monkeypatch, **data):
    calls = []

    def fake(reference):
        calls.append(reference)
        return {"reference": reference, "currency": "NGN", **data}

    monkeypatch.setattr(paystack, "verify_transaction", fake)
    return calls


def test_start_freezes_the_server_quote_for_paystack(product):
    resp = start(product, total=1, amount=1)
    assert resp.status_code == 201
    body = resp.json()
    session = CheckoutSession.objects.get(reference=body["reference"])
    # 2 x 10,000 plus the Eti-Osa cross-lagoon band (seeded at 3,000).
    assert body["amount"] == session.total == 2000000 + 300000
    assert body["public_key"] == "pk_test_local"
    assert body["channels"] == ["card", "bank_transfer"]
    assert session.status == "pending"
    assert session.shipping_address["lga"] == "Eti-Osa"
    assert session.lines[0]["unit_price"] == 1000000


def test_each_start_gets_a_new_unguessable_reference(product):
    a, b = start(product).json()["reference"], start(product).json()["reference"]
    assert a != b and len(a) > 20


def test_start_refuses_a_guest_without_an_email(product):
    assert start(product, email="").status_code == 400


def test_start_refuses_an_incomplete_address(product):
    resp = start(product, shipping={**SHIPPING, "address_line_1": ""})
    assert resp.status_code == 400


def test_start_refuses_a_bad_promo_rather_than_charging_without_it(product):
    resp = start(product, promo_code="NOPE")
    assert resp.status_code == 400
    assert "promo_code" in resp.json()


def test_payments_switch_off_without_keys(product, settings):
    settings.PAYSTACK_SECRET_KEY = ""
    assert start(product).status_code == 503
    assert verify("anything").status_code == 503


def test_verify_marks_paid_only_on_paystacks_word(product, monkeypatch):
    reference = start(product).json()["reference"]
    calls = paystack_says(monkeypatch, status="success", amount=2300000)
    resp = verify(reference)
    assert resp.status_code == 200
    assert resp.json()["status"] == "paid"
    assert calls == [reference]
    assert CheckoutSession.objects.get(reference=reference).paid_at is not None


def test_a_failed_payment_is_reported_and_can_be_retried(product, monkeypatch):
    reference = start(product).json()["reference"]
    paystack_says(monkeypatch, status="failed", amount=2300000)
    resp = verify(reference)
    assert resp.status_code == 402
    assert "weren't charged" in resp.json()["detail"]
    assert CheckoutSession.objects.get(reference=reference).status == "failed"
    retry = start(product)
    assert retry.status_code == 201
    assert retry.json()["reference"] != reference


def test_an_amount_mismatch_is_never_marked_paid(product, monkeypatch):
    reference = start(product).json()["reference"]
    paystack_says(monkeypatch, status="success", amount=100)
    assert verify(reference).status_code == 409
    assert CheckoutSession.objects.get(reference=reference).status == "pending"


def test_a_wrong_currency_is_never_marked_paid(product, monkeypatch):
    reference = start(product).json()["reference"]
    monkeypatch.setattr(
        paystack,
        "verify_transaction",
        lambda ref: {"status": "success", "amount": 2300000, "currency": "USD"},
    )
    assert verify(reference).status_code == 409


def test_paystack_unreachable_is_a_retryable_error(product, monkeypatch):
    reference = start(product).json()["reference"]

    def down(ref):
        raise paystack.PaystackError("down")

    monkeypatch.setattr(paystack, "verify_transaction", down)
    assert verify(reference).status_code == 502
    assert CheckoutSession.objects.get(reference=reference).status == "pending"


def test_an_unknown_reference_is_404(monkeypatch):
    assert verify("MOMPAY-nope").status_code == 404


def test_verify_transaction_calls_paystack_with_the_secret(monkeypatch, settings):
    seen = {}

    class Resp:
        status_code = 200
        content = b"{}"

        def json(self):
            return {"status": True, "data": {"status": "success"}}

    def fake_get(url, headers, timeout):
        seen.update(url=url, auth=headers["Authorization"], timeout=timeout)
        return Resp()

    monkeypatch.setattr(requests, "get", fake_get)
    assert paystack.verify_transaction("REF1") == {"status": "success"}
    assert seen == {
        "url": "https://api.paystack.co/transaction/verify/REF1",
        "auth": "Bearer sk_test_local",
        "timeout": 10,
    }
