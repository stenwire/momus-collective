import re
from datetime import timedelta

import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework.test import APIClient

from carts.models import SavedDesign
from carts.services import add_line, user_cart
from designs.tests.test_saved_designs import CONFIG
from orders.models import Order
from orders.tests.test_fulfilment import (  # noqa: F401 (keys is a fixture)
    SHIPPING,
    client_for,
    guest_start,
    keys,
    pay,
    start,
)

pytestmark = pytest.mark.django_db


def track(token):
    return APIClient().get(f"/api/v1/orders/track/{token}/")


def guest_order(product, monkeypatch, **extra):
    body = guest_start(product, **extra)
    pay(monkeypatch, body)
    return Order.objects.get(paystack_reference=body["reference"])


def test_the_tracking_link_opens_the_order(product, monkeypatch):
    order = guest_order(product, monkeypatch)
    resp = track(order.tracking_token)
    assert resp.status_code == 200
    data = resp.json()
    assert data["order_number"] == order.order_number
    assert (data["status"], data["status_label"]) == ("paid", "Paid")
    assert data["status_history"][0]["label"] == "Paid"
    assert data["total"] == 2300000
    [item] = data["items"]
    assert (item["slogan_text"], item["quantity"], item["line_total"]) == (
        "touch grass",
        2,
        2000000,
    )
    assert item["product"]["slug"] == "tg"
    assert data["tracking_url"].endswith(f"/track/{order.tracking_token}")


def test_the_tracking_link_carries_no_contact_details_or_address(product, monkeypatch):
    order = guest_order(product, monkeypatch)
    body = track(order.tracking_token).content.decode()
    for private in (
        "guest@example.com",
        SHIPPING["phone"],
        SHIPPING["full_name"],
        SHIPPING["address_line_1"],
        SHIPPING["notes"],
    ):
        assert private not in body
    assert "shipping_address" not in track(order.tracking_token).json()


def test_the_order_number_alone_opens_nothing(product, monkeypatch):
    order = guest_order(product, monkeypatch)
    assert track(order.order_number).status_code == 404
    assert track("not-a-token").status_code == 404
    near_miss = order.tracking_token[:-1] + (
        "A" if order.tracking_token[-1] != "A" else "B"
    )
    assert track(near_miss).status_code == 404


def test_tokens_are_long_random_and_unrelated_to_the_number(product, monkeypatch):
    first = guest_order(product, monkeypatch)
    second = guest_order(product, monkeypatch)
    for order in (first, second):
        # 32 random bytes, url-safe base64: 256 bits, not enumerable.
        assert re.fullmatch(r"[A-Za-z0-9_-]{43}", order.tracking_token)
        assert order.order_number[-3:] not in order.tracking_token[:3]
    assert first.tracking_token != second.tracking_token


def test_estimated_delivery_follows_the_snapshot_state(product, monkeypatch):
    lagos = guest_order(product, monkeypatch)
    today = timezone.localdate(lagos.paid_at)
    assert track(lagos.tracking_token).json()["estimated_delivery"] == {
        "earliest": (today + timedelta(days=1)).isoformat(),
        "latest": (today + timedelta(days=3)).isoformat(),
    }
    abuja = guest_order(
        product,
        monkeypatch,
        shipping={**SHIPPING, "state": "FCT", "lga": "Abuja Municipal"},
    )
    assert track(abuja.tracking_token).json()["estimated_delivery"] == {
        "earliest": (today + timedelta(days=3)).isoformat(),
        "latest": (today + timedelta(days=7)).isoformat(),
    }


def test_a_design_line_shows_the_design_as_ordered(user, monkeypatch):
    design = SavedDesign.objects.create(user=user, name="mine", config=CONFIG)
    add_line(user_cart(user), saved_design=design, size="L", color="", quantity=1)
    body = start(client_for(user))
    pay(monkeypatch, body)
    order = Order.objects.get(paystack_reference=body["reference"])
    SavedDesign.objects.filter(id=design.id).update(
        config={**CONFIG, "text": "changed"}
    )
    [item] = track(order.tracking_token).json()["items"]
    assert item["kind"] == "design"
    assert item["design_config"]["text"] == CONFIG["text"]
    assert item["product"] is None


def test_tracking_num_queries_do_not_grow_with_items(product, monkeypatch):
    one = guest_order(product, monkeypatch)
    many = guest_order(
        product,
        monkeypatch,
        items=[
            {"product": str(product.id), "size": size, "color": "", "quantity": 1}
            for size in ("S", "M", "L", "XL")
        ],
    )
    counts = []
    for order in (one, many):
        with CaptureQueriesContext(connection) as queries:
            assert track(order.tracking_token).status_code == 200
        counts.append(len(queries))
    assert counts[0] == counts[1]


def test_tracking_is_throttled():
    statuses = [track(f"guess-{i}").status_code for i in range(31)]
    assert statuses[:30] == [404] * 30
    assert statuses[30] == 429
