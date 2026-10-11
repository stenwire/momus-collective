from datetime import timedelta
from unittest.mock import patch

import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User
from accounts.tokens import make_email_verification_token
from orders.models import Order, OrderItem
from orders.tests.test_fulfilment import SHIPPING, client_for

pytestmark = pytest.mark.django_db
URL = "/api/v1/orders/"


def make_order(n, product, user=None, email="", days_ago=0, items=1):
    order = Order.objects.create(
        order_number=f"MOM-20261011-{n:03d}",
        user=user,
        guest_email=email,
        guest_phone="+2348000000000" if email else "",
        shipping_address=SHIPPING,
        subtotal=1000000 * items,
        delivery_fee=300000,
        total=1000000 * items + 300000,
        paid_at=timezone.now(),
        status_history=[{"status": "paid", "timestamp": timezone.now().isoformat()}],
    )
    Order.objects.filter(id=order.id).update(
        created_at=timezone.now() - timedelta(days=days_ago)
    )
    for _ in range(items):
        OrderItem.objects.create(
            order=order,
            product=product,
            slogan_text=product.slogan,
            size="M",
            color="Black",
            quantity=1,
            unit_price=1000000,
        )
    return order


def numbers(resp):
    return [o["order_number"] for o in resp.json()["results"]]


def test_order_history_authz_anonymous_is_401():
    assert APIClient().get(URL).status_code == 401


def test_history_is_reverse_chronological_and_only_mine(product, user):
    make_order(1, product, user, days_ago=5)
    make_order(2, product, user, days_ago=0)
    make_order(3, product, user, days_ago=2)
    other = User.objects.create_user(
        email="other@example.com", password="correct-horse-battery", phone="1"
    )
    make_order(4, product, other)
    make_order(5, product, email="guest@example.com")
    resp = client_for(user).get(URL)
    assert resp.status_code == 200
    assert numbers(resp) == ["MOM-20261011-002", "MOM-20261011-003", "MOM-20261011-001"]


def test_each_order_carries_its_full_detail(product, user):
    order = make_order(1, product, user, items=2)
    [data] = client_for(user).get(URL).json()["results"]
    assert data["status_label"] == "Paid"
    assert data["created_at"]
    assert len(data["items"]) == 2 and data["items"][0]["slogan_text"] == "touch grass"
    assert data["total"] == 2300000
    assert data["shipping_address"]["address_line_1"] == "12 Admiralty Way"
    assert data["status_history"][0]["label"] == "Paid"
    assert data["tracking_url"].endswith(order.tracking_token)


def test_history_is_paginated(product, user):
    for n in range(12):
        make_order(n + 1, product, user, days_ago=n)
    first = client_for(user).get(URL).json()
    assert first["count"] == 12 and len(first["results"]) == 10 and first["next"]
    second = client_for(user).get(URL, {"page": 2}).json()
    assert [o["order_number"] for o in second["results"]] == [
        "MOM-20261011-011",
        "MOM-20261011-012",
    ]


def test_order_history_num_queries_do_not_grow(product, user):
    make_order(1, product, user)
    client = client_for(user)
    with CaptureQueriesContext(connection) as one:
        client.get(URL)
    for n in range(2, 8):
        make_order(n, product, user, items=3)
    with CaptureQueriesContext(connection) as many:
        assert len(client.get(URL).json()["results"]) == 7
    assert len(one) == len(many)


def test_verifying_an_email_claims_that_guests_orders(product):
    make_order(1, product, email="Ada@Example.com")
    make_order(2, product, email="someone@example.com")
    user = User.objects.create_user(
        email="ada@example.com", password="correct-horse-battery", phone="1"
    )
    # Unverified: an email typed at registration proves nothing yet.
    assert numbers(client_for(user).get(URL)) == []
    token = make_email_verification_token(user)
    APIClient().post("/api/v1/auth/verify-email/", {"token": token})
    assert numbers(client_for(user).get(URL)) == ["MOM-20261011-001"]
    assert Order.objects.get(order_number="MOM-20261011-002").user is None


@patch("accounts.auth_views.google_id_token.verify_oauth2_token")
def test_a_google_sign_in_claims_that_guests_orders(mock_verify, product):
    make_order(1, product, email="ada@example.com")
    mock_verify.return_value = {
        "email": "ada@example.com",
        "email_verified": True,
        "given_name": "Ada",
    }
    APIClient().post("/api/v1/auth/login/google/", {"credential": "t"}, format="json")
    user = User.objects.get(email="ada@example.com")
    assert numbers(client_for(user).get(URL)) == ["MOM-20261011-001"]
