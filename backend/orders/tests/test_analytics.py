from datetime import datetime
from zoneinfo import ZoneInfo

import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient

from accounts.models import User
from catalog.models import Category, Product
from orders.analytics import analytics
from orders.models import Order, OrderItem
from orders.tests.test_fulfilment import SHIPPING, client_for

pytestmark = pytest.mark.django_db
LAGOS = ZoneInfo("Africa/Lagos")
NOW = datetime(2026, 10, 14, 15, 0, tzinfo=LAGOS)  # a Wednesday


def at(*args):
    return datetime(*args, tzinfo=LAGOS)


@pytest.fixture
def catalog():
    # Both are among the seeded launch categories (SPC-01).
    philosophy = Category.objects.get(name="Philosophy")
    tech = Category.objects.get(name="Tech")
    p1 = Product.objects.create(slogan="p one", slug="p1", category=philosophy, price=1)
    p2 = Product.objects.create(slogan="p two", slug="p2", category=tech, price=1)
    return p1, p2


def order(n, when, total, status="paid", lines=()):
    o = Order.objects.create(
        order_number=f"MOM-20261014-{n:03d}",
        guest_email="g@example.com",
        guest_phone="1",
        shipping_address=SHIPPING,
        subtotal=total,
        delivery_fee=0,
        total=total,
        status=status,
    )
    Order.objects.filter(pk=o.pk).update(created_at=when)
    for product, quantity in lines:
        OrderItem.objects.create(
            order=o,
            product=product,
            slogan_text="x",
            size="M",
            color="Black",
            quantity=quantity,
            unit_price=1,
            design_config=None if product else {"text": "custom"},
        )
    return o


@pytest.fixture
def history(catalog):
    p1, p2 = catalog
    order(1, at(2026, 10, 14, 10), 1000000, lines=[(p1, 2)])
    order(2, at(2026, 10, 12, 10), 2000000, "delivered", lines=[(p2, 1), (None, 1)])
    order(3, at(2026, 10, 2, 10), 4000000, "printed", lines=[(p1, 1)])
    order(4, at(2026, 9, 20, 10), 8000000, lines=[(p2, 5)])
    order(5, at(2026, 10, 14, 11), 500000, "cancelled", lines=[(p1, 9)])
    order(6, at(2026, 10, 14, 12), 700000, "refunded", lines=[(p2, 9)])


def test_revenue_by_period_leaves_out_cancelled_and_refunded(history):
    data = analytics(now=NOW)
    assert data["revenue"] == {
        "today": 1000000,
        "week": 3000000,
        "month": 7000000,
        "all_time": 15000000,
    }
    assert data["average_order_value"] == 3750000


def test_orders_by_status_counts_every_status(history):
    counts = {r["status"]: r["count"] for r in analytics(now=NOW)["orders_by_status"]}
    assert counts == {
        "paid": 2,
        "moderation": 0,
        "shirt_acquired": 0,
        "printed": 1,
        "out_for_delivery": 0,
        "delivered": 1,
        "cancelled": 1,
        "refunded": 1,
    }


def test_top_products_categories_and_custom_share(history):
    data = analytics(now=NOW)
    assert [(p["slug"], p["quantity"], p["orders"]) for p in data["top_products"]] == [
        ("p2", 6, 2),
        ("p1", 3, 2),
    ]
    assert [(c["name"], c["orders"], c["quantity"]) for c in data["categories"]] == [
        ("Philosophy", 2, 3),
        ("Tech", 2, 6),
    ]
    assert data["custom_vs_catalog"] == {"custom": 1, "catalog": 3}


def test_top_products_stop_at_ten(catalog):
    category = catalog[0].category
    for n in range(12):
        product = Product.objects.create(
            slogan=f"s{n:02d}", slug=f"s{n}", category=category, price=1
        )
        order(10 + n, NOW, 100, lines=[(product, n + 1)])
    top = analytics(now=NOW)["top_products"]
    assert len(top) == 10 and top[0]["quantity"] == 12


def test_the_trend_is_thirty_days_zero_filled_in_lagos_time(history):
    trend = analytics(now=NOW)["trend"]
    assert len(trend) == 30
    assert (trend[0]["date"], trend[-1]["date"]) == ("2026-09-15", "2026-10-14")
    by_day = {d["date"]: d for d in trend if d["orders"]}
    assert {k: (v["revenue"], v["orders"]) for k, v in by_day.items()} == {
        "2026-09-20": (8000000, 1),
        "2026-10-02": (4000000, 1),
        "2026-10-12": (2000000, 1),
        "2026-10-14": (1000000, 1),
    }


def test_just_after_midnight_lagos_counts_on_the_lagos_day(catalog):
    # 00:30 in Lagos is 23:30 UTC the day before.
    order(1, at(2026, 10, 14, 0, 30), 100)
    data = analytics(now=NOW)
    assert [d["date"] for d in data["trend"] if d["orders"]] == ["2026-10-14"]
    assert data["revenue"]["today"] == 100


def test_an_empty_store_has_zeroes_not_errors():
    data = analytics(now=NOW)
    assert data["revenue"]["all_time"] == 0 and data["average_order_value"] == 0
    assert data["top_products"] == [] and len(data["trend"]) == 30


def test_admin_analytics_authz(user):
    url = "/api/v1/admin/analytics/"
    assert APIClient().get(url).status_code == 401
    assert client_for(user).get(url).status_code == 403
    staff = User.objects.create_user(
        email="owner@example.com", password="x" * 12, phone="1", is_staff=True
    )
    assert client_for(staff).get(url).status_code == 200


def test_analytics_num_queries_do_not_grow_with_orders(catalog):
    p1, _ = catalog
    order(1, NOW, 100, lines=[(p1, 1)])
    with CaptureQueriesContext(connection) as few:
        analytics(now=NOW)
    for n in range(2, 30):
        order(n, NOW, 100, lines=[(p1, 1), (None, 1)])
    with CaptureQueriesContext(connection) as many:
        analytics(now=NOW)
    assert len(few) == len(many)
