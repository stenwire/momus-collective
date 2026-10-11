from datetime import timedelta

import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User
from orders.models import Order, OrderItem
from orders.tests.test_fulfilment import SHIPPING, client_for

pytestmark = pytest.mark.django_db
BOARD = "/api/v1/admin/orders/board/"


@pytest.fixture
def staff():
    return User.objects.create_user(
        email="owner@example.com", password="x" * 12, phone="1", is_staff=True
    )


def make(n, status="paid", days_ago=0, items=1, custom=False, product=None):
    order = Order.objects.create(
        order_number=f"MOM-20261011-{n:03d}",
        guest_email="g@example.com",
        guest_phone="1",
        shipping_address={**SHIPPING, "full_name": f"Customer {n}"},
        subtotal=1000000,
        delivery_fee=0,
        total=1000000,
        status=status,
        status_history=[{"status": status, "timestamp": "2026-10-11T00:00:00"}],
    )
    Order.objects.filter(pk=order.pk).update(
        created_at=timezone.now() - timedelta(days=days_ago)
    )
    for _ in range(items):
        OrderItem.objects.create(
            order=order,
            product=product,
            slogan_text="s",
            size="M",
            color="Black",
            quantity=2,
            unit_price=500000,
            design_config={"text": "x"} if custom else None,
        )
    return order


def status_url(order):
    return f"/api/v1/admin/orders/{order.id}/status/"


def test_admin_order_board_authz(user):
    order = make(1)
    for client, code in ((APIClient(), 401), (client_for(user), 403)):
        assert client.get(BOARD).status_code == code
        assert (
            client.patch(status_url(order), {"status": "printed"}, format="json")
        ).status_code == code
    order.refresh_from_db()
    assert order.status == "paid"


def test_the_board_has_six_columns_newest_first(staff):
    make(1, "paid", days_ago=2)
    make(2, "paid", days_ago=0, custom=True)
    make(3, "printed")
    make(4, "moderation")
    make(5, "refunded")
    columns = client_for(staff).get(BOARD).json()["columns"]
    assert [(c["status"], c["label"]) for c in columns] == [
        ("paid", "Paid"),
        ("shirt_acquired", "Shirt Acquired"),
        ("printed", "Printed"),
        ("out_for_delivery", "Out for Delivery"),
        ("delivered", "Delivered"),
        ("cancelled", "Cancelled"),
    ]
    paid = columns[0]
    assert [o["order_number"] for o in paid["orders"]] == [
        "MOM-20261011-002",
        "MOM-20261011-001",
    ]
    card = paid["orders"][0]
    assert card["customer"] == "Customer 2"
    assert (card["item_count"], card["has_custom"], card["total"]) == (2, True, 1000000)
    numbers = [o["order_number"] for c in columns for o in c["orders"]]
    assert "MOM-20261011-004" not in numbers and "MOM-20261011-005" not in numbers


def test_long_columns_are_capped_but_counted(staff):
    for n in range(52):
        make(n + 1, "delivered", items=0)
    delivered = client_for(staff).get(BOARD).json()["columns"][4]
    assert delivered["count"] == 52 and len(delivered["orders"]) == 50


def test_admin_order_board_num_queries_are_constant(staff):
    client = client_for(staff)
    # Empty columns skip their item prefetch, so fill the same columns.
    for n, status in enumerate(["paid", "printed", "delivered"], start=1):
        make(n, status)
    with CaptureQueriesContext(connection) as few:
        client.get(BOARD)
    for n in range(4, 22):
        make(n, ["paid", "printed", "delivered"][n % 3], items=3)
    with CaptureQueriesContext(connection) as many:
        client.get(BOARD)
    assert len(few) == len(many)


def test_dragging_moves_the_order_and_records_who_and_when(staff):
    order = make(1)
    resp = client_for(staff).patch(
        status_url(order),
        {"status": "shirt_acquired", "note": "From Yaba"},
        format="json",
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "shirt_acquired"
    order.refresh_from_db()
    assert order.status == "shirt_acquired"
    last = order.status_history[-1]
    assert (last["status"], last["by"], last["note"]) == (
        "shirt_acquired",
        "owner@example.com",
        "From Yaba",
    )
    assert len(order.status_history) == 2


def test_dropping_on_the_same_column_changes_nothing(staff):
    order = make(1, "printed")
    client_for(staff).patch(status_url(order), {"status": "printed"}, format="json")
    order.refresh_from_db()
    assert len(order.status_history) == 1


@pytest.mark.parametrize("target", ["refunded", "moderation", "lost"])
def test_only_board_columns_are_targets(staff, target):
    order = make(1)
    resp = client_for(staff).patch(status_url(order), {"status": target}, format="json")
    assert resp.status_code == 400
    order.refresh_from_db()
    assert order.status == "paid"


def test_an_order_awaiting_moderation_cannot_be_dragged(staff):
    order = make(1, "moderation")
    resp = client_for(staff).patch(
        status_url(order), {"status": "printed"}, format="json"
    )
    assert resp.status_code == 400
    assert "moderation" in str(resp.json())


def test_an_unknown_order_is_404(staff):
    resp = client_for(staff).patch(
        "/api/v1/admin/orders/00000000-0000-0000-0000-000000000000/status/",
        {"status": "printed"},
        format="json",
    )
    assert resp.status_code == 404
