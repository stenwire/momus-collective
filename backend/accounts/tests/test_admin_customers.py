from datetime import timedelta

import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User
from orders.models import Order
from orders.tests.test_fulfilment import SHIPPING, client_for

pytestmark = pytest.mark.django_db
URL = "/api/v1/admin/customers/"


@pytest.fixture
def staff():
    return client_for(
        User.objects.create_user(
            email="owner@example.com", password="x" * 12, phone="1", is_staff=True
        )
    )


def customer(email, first="Ada", last="", phone="+2348000000000"):
    return User.objects.create_user(
        email=email, password="x" * 12, first_name=first, last_name=last, phone=phone
    )


_n = iter(range(1, 1000))


def order(user, total, status="paid", days_ago=0):
    o = Order.objects.create(
        order_number=f"MOM-20261012-{next(_n):03d}",
        user=user,
        shipping_address=SHIPPING,
        subtotal=total,
        delivery_fee=0,
        total=total,
        status=status,
    )
    Order.objects.filter(pk=o.pk).update(
        created_at=timezone.now() - timedelta(days=days_ago)
    )
    return o


@pytest.fixture
def shop():
    ada = customer("ada@example.com", "Ada", "Lovelace", "+2348011111111")
    chi = customer("chi@example.com", "Chiamaka", "Obi", "+2348022222222")
    new = customer("new@example.com", "Nnamdi", "", "+2348033333333")
    order(ada, 1000000, days_ago=10)
    order(ada, 2000000, "delivered", days_ago=3)
    order(ada, 500000, "cancelled", days_ago=1)
    order(chi, 5000000, days_ago=5)
    return ada, chi, new


def emails(resp):
    return [r["email"] for r in resp.json()["results"]]


def test_admin_customers_authz(shop):
    ada = shop[0]
    customer_client = client_for(ada)
    for client, status in ((APIClient(), 401), (customer_client, 403)):
        assert client.get(URL).status_code == status
        assert client.get(f"{URL}{ada.id}/").status_code == status


def test_each_customer_shows_their_totals_and_last_order(staff, shop):
    rows = {r["email"]: r for r in staff.get(URL).json()["results"]}
    assert "owner@example.com" not in rows
    ada = rows["ada@example.com"]
    assert (ada["name"], ada["phone"], ada["order_count"], ada["total_spent"]) == (
        "Ada Lovelace",
        "+2348011111111",
        3,
        3000000,
    )
    assert ada["last_order_at"] is not None
    new = rows["new@example.com"]
    assert (new["order_count"], new["total_spent"], new["last_order_at"]) == (
        0,
        0,
        None,
    )


def test_customers_sort_and_search(staff, shop):
    assert emails(staff.get(URL)) == [
        "ada@example.com",
        "chi@example.com",
        "new@example.com",
    ]
    assert emails(staff.get(URL, {"ordering": "-spent"}))[:2] == [
        "chi@example.com",
        "ada@example.com",
    ]
    assert emails(staff.get(URL, {"ordering": "-orders"}))[0] == "ada@example.com"
    assert emails(staff.get(URL, {"ordering": "name"})) == [
        "ada@example.com",
        "chi@example.com",
        "new@example.com",
    ]
    assert emails(staff.get(URL, {"ordering": "last_order"})) == [
        "chi@example.com",
        "ada@example.com",
        "new@example.com",
    ]
    assert emails(staff.get(URL, {"search": "obi"})) == ["chi@example.com"]
    assert emails(staff.get(URL, {"search": "33333"})) == ["new@example.com"]
    assert staff.get(URL, {"ordering": "height"}).status_code == 400


def test_a_customers_page_lists_their_orders(staff, shop):
    ada = shop[0]
    data = staff.get(f"{URL}{ada.id}/").json()
    assert data["email"] == "ada@example.com" and data["order_count"] == 3
    assert [(o["status_label"], o["total"]) for o in data["orders"]] == [
        ("Cancelled", 500000),
        ("Delivered", 2000000),
        ("Paid", 1000000),
    ]
    assert data["notification_pref"] == "email"


def test_staff_and_unknown_ids_are_not_customers(staff, shop):
    owner = User.objects.get(email="owner@example.com")
    assert staff.get(f"{URL}{owner.id}/").status_code == 404
    assert staff.get(f"{URL}00000000-0000-0000-0000-000000000000/").status_code == 404


def test_customers_page_by_25(staff):
    for n in range(27):
        customer(f"c{n:02d}@example.com")
    first = staff.get(URL).json()
    assert first["count"] == 27 and len(first["results"]) == 25


def test_admin_customers_num_queries_are_constant(staff):
    order(customer("one@example.com"), 100)
    with CaptureQueriesContext(connection) as few:
        staff.get(URL)
    for n in range(10):
        user = customer(f"many{n}@example.com")
        order(user, 100)
        order(user, 200, "delivered")
    with CaptureQueriesContext(connection) as many:
        staff.get(URL)
    assert len(few) == len(many)
