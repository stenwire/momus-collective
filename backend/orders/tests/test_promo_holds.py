import threading
from datetime import timedelta
from importlib import import_module

import pytest
from django.apps import apps
from django.db import connection
from django.utils import timezone
from rest_framework.test import APIClient

from orders.models import CheckoutSession
from orders.tests.test_fulfilment import (  # noqa: F401 (keys is a fixture)
    SHIPPING,
    keys,
    pay,
)
from promocodes.models import PromoCode

pytestmark = pytest.mark.django_db


def start(product, email, code="LAST"):
    return APIClient().post(
        "/api/v1/checkout/",
        {
            "items": [
                {"product": str(product.id), "size": "M", "color": "", "quantity": 1}
            ],
            "email": email,
            "shipping": SHIPPING,
            "promo_code": code,
        },
        format="json",
    )


def cancel(reference):
    return APIClient().post(
        "/api/v1/checkout/cancel/", {"reference": reference}, format="json"
    )


def code(**limits):
    return PromoCode.objects.create(
        code="LAST", discount_type="flat", discount_value=100000, **limits
    )


def test_an_unpaid_checkout_holds_the_last_use(product):
    code(max_uses=1)
    first = start(product, "a@example.com")
    assert first.status_code == 201
    second = start(product, "b@example.com")
    assert second.status_code == 400
    assert "held by checkouts in progress" in second.json()["promo_code"]


def test_cancelling_releases_the_hold(product):
    code(max_uses=1)
    first = start(product, "a@example.com").json()
    assert cancel(first["reference"]).status_code == 204
    assert start(product, "b@example.com").status_code == 201


def test_a_hold_lapses_after_thirty_minutes(product):
    code(max_uses=1)
    first = start(product, "a@example.com").json()
    CheckoutSession.objects.filter(reference=first["reference"]).update(
        created_at=timezone.now() - timedelta(minutes=31)
    )
    assert start(product, "b@example.com").status_code == 201


def test_one_customer_cannot_open_two_checkouts_on_a_one_use_code(product):
    code(max_uses_per_user=1)
    first = start(product, "a@example.com").json()
    second = start(product, "A@Example.com")
    assert second.status_code == 400
    assert "unfinished checkout" in second.json()["promo_code"]
    assert start(product, "b@example.com").status_code == 201
    # A retry after cancelling the popup is allowed.
    cancel(first["reference"])
    assert start(product, "a@example.com").status_code == 201


def test_a_paid_use_is_counted_once_not_as_a_hold_too(product, monkeypatch):
    code(max_uses=2)
    first = start(product, "a@example.com").json()
    pay(monkeypatch, first)
    assert PromoCode.objects.get(code="LAST").uses_count == 1
    assert start(product, "b@example.com").status_code == 201
    assert start(product, "c@example.com").status_code == 400


def test_cancel_never_unpays_and_needs_a_real_reference(product, monkeypatch):
    code(max_uses=5)
    body = start(product, "a@example.com").json()
    pay(monkeypatch, body)
    assert cancel(body["reference"]).status_code == 204
    assert CheckoutSession.objects.get(reference=body["reference"]).status == "paid"
    assert cancel("MOMPAY-nope").status_code == 404


def test_a_cancelled_checkout_that_is_paid_after_all_still_settles(
    product, monkeypatch
):
    code(max_uses=5)
    body = start(product, "a@example.com").json()
    cancel(body["reference"])
    assert pay(monkeypatch, body).status_code == 200
    assert CheckoutSession.objects.get(reference=body["reference"]).status == "paid"


@pytest.mark.django_db(transaction=True)
def test_racing_checkouts_cannot_overrun_the_limit(product):
    # An earlier transactional test's flush removes the seeded row.
    import_module("orders.migrations.0004_seed_delivery_settings").seed(apps, None)
    code(max_uses=1)
    barrier = threading.Barrier(4)
    statuses = []

    def run(n):
        try:
            barrier.wait()
            statuses.append(start(product, f"racer{n}@example.com").status_code)
        finally:
            connection.close()

    threads = [threading.Thread(target=run, args=(n,)) for n in range(4)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    assert sorted(statuses) == [201, 400, 400, 400]
    assert CheckoutSession.objects.filter(promo_code="LAST").count() == 1
