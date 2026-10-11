import hashlib
import hmac
import json

import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient

from orders.models import CheckoutSession

pytestmark = pytest.mark.django_db
URL = "/api/v1/payments/paystack/webhook/"
SECRET = "sk_test_webhook"


@pytest.fixture(autouse=True)
def keys(settings):
    settings.PAYSTACK_SECRET_KEY = SECRET
    settings.PAYSTACK_PUBLIC_KEY = "pk_test_webhook"


@pytest.fixture
def session():
    return CheckoutSession.objects.create(
        email="g@example.com",
        phone="1",
        shipping_address={},
        lines=[],
        subtotal=1000000,
        delivery_fee=300000,
        total=1300000,
    )


def event(reference, amount=1300000, kind="charge.success", status="success"):
    return json.dumps(
        {
            "event": kind,
            "data": {
                "reference": reference,
                "amount": amount,
                "currency": "NGN",
                "status": status,
            },
        }
    ).encode()


def sign(body, secret=SECRET):
    return hmac.new(secret.encode(), body, hashlib.sha512).hexdigest()


def post(body, signature=None):
    headers = {} if signature is None else {"HTTP_X_PAYSTACK_SIGNATURE": signature}
    return APIClient().post(URL, body, content_type="application/json", **headers)


def test_webhook_unsigned_is_401_and_touches_nothing(session):
    body = event(session.reference)
    with CaptureQueriesContext(connection) as queries:
        resp = post(body)
    assert resp.status_code == 401
    assert len(queries) == 0
    session.refresh_from_db()
    assert session.status == "pending"


def test_webhook_wrong_signature_is_401_and_touches_nothing(session):
    body = event(session.reference)
    with CaptureQueriesContext(connection) as queries:
        resp = post(body, sign(body, secret="sk_test_someone_else"))
    assert resp.status_code == 401
    assert len(queries) == 0
    session.refresh_from_db()
    assert session.status == "pending"


def test_webhook_signature_over_a_different_body_is_401(session):
    signed = event(session.reference, amount=1)
    tampered = event(session.reference)
    assert post(tampered, sign(signed)).status_code == 401


def test_webhook_without_a_configured_secret_rejects_everything(session, settings):
    settings.PAYSTACK_SECRET_KEY = ""
    body = event(session.reference)
    # Signed with the empty key a forger could guess.
    assert post(body, sign(body, secret="")).status_code == 401


def test_webhook_valid_charge_success_marks_the_session_paid(session):
    body = event(session.reference)
    assert post(body, sign(body)).status_code == 200
    session.refresh_from_db()
    assert session.status == "paid"
    assert session.paid_at is not None


def test_webhook_amount_mismatch_is_acknowledged_but_never_paid(session):
    body = event(session.reference, amount=100)
    assert post(body, sign(body)).status_code == 200
    session.refresh_from_db()
    assert session.status == "pending"


def test_webhook_other_events_are_acknowledged_and_ignored(session):
    body = event(session.reference, kind="transfer.success")
    assert post(body, sign(body)).status_code == 200
    session.refresh_from_db()
    assert session.status == "pending"


def test_webhook_unknown_reference_is_acknowledged(session):
    body = event("MOMPAY-unknown")
    assert post(body, sign(body)).status_code == 200


def test_webhook_signed_garbage_is_400():
    body = b"not json"
    assert post(body, sign(body)).status_code == 400


def test_webhook_ignores_cookies_and_csrf(session):
    client = APIClient(enforce_csrf_checks=True)
    client.cookies["momus_access"] = "anything"
    body = event(session.reference)
    resp = client.post(
        URL, body, content_type="application/json", HTTP_X_PAYSTACK_SIGNATURE=sign(body)
    )
    assert resp.status_code == 200


def test_webhook_replay_changes_nothing_after_the_first(session):
    body = event(session.reference)
    signature = sign(body)
    assert post(body, signature).status_code == 200
    session.refresh_from_db()
    first_paid_at = session.paid_at
    for _ in range(3):
        assert post(body, signature).status_code == 200
    session.refresh_from_db()
    assert session.status == "paid"
    assert session.paid_at == first_paid_at


def test_settle_reports_the_paid_transition_exactly_once(session):
    from orders.payments import settle

    data = {"status": "success", "amount": 1300000, "currency": "NGN"}
    assert settle(session.reference, data)[1] is True
    assert settle(session.reference, data)[1] is False
    assert settle(session.reference, data)[1] is False


@pytest.mark.django_db(transaction=True)
def test_webhook_racing_verify_settles_once():
    import threading

    from orders.payments import settle

    racing = CheckoutSession.objects.create(
        email="g@example.com",
        phone="1",
        shipping_address={},
        lines=[],
        subtotal=1,
        delivery_fee=0,
        total=1300000,
    )
    data = {"status": "success", "amount": 1300000, "currency": "NGN"}
    barrier = threading.Barrier(4)
    transitions = []

    def run():
        try:
            barrier.wait()
            transitions.append(settle(racing.reference, data)[1])
        finally:
            connection.close()

    threads = [threading.Thread(target=run) for _ in range(4)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    assert sorted(transitions) == [False, False, False, True]
