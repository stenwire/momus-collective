from datetime import timedelta

import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User
from carts.models import SavedDesign
from carts.services import add_line, user_cart
from designs.tests.test_saved_designs import CONFIG
from orders.models import Order
from orders.tests.test_admin_board import make
from orders.tests.test_fulfilment import (  # noqa: F401 (keys is a fixture)
    client_for,
    guest_start,
    keys,
    pay,
    start,
)

pytestmark = pytest.mark.django_db
QUEUE = "/api/v1/admin/moderation/"


@pytest.fixture
def staff():
    return User.objects.create_user(
        email="owner@example.com", password="x" * 12, phone="1", is_staff=True
    )


def custom_order(user, monkeypatch, with_catalog=None):
    design = SavedDesign.objects.create(user=user, name="mine", config=CONFIG)
    cart = user_cart(user)
    add_line(cart, saved_design=design, size="L", color="", quantity=1)
    if with_catalog:
        add_line(cart, product=with_catalog, size="M", color="", quantity=1)
    body = start(client_for(user))
    pay(monkeypatch, body)
    return Order.objects.get(paystack_reference=body["reference"])


def approve_url(order):
    return f"{QUEUE}{order.id}/approve/"


def test_a_catalog_order_goes_straight_to_paid(product, monkeypatch):
    body = guest_start(product)
    pay(monkeypatch, body)
    order = Order.objects.get(paystack_reference=body["reference"])
    assert order.status == "paid"
    assert [h["status"] for h in order.status_history] == ["paid"]


def test_a_custom_design_order_waits_for_moderation(user, product, monkeypatch, staff):
    order = custom_order(user, monkeypatch, with_catalog=product)
    assert order.status == "moderation"
    assert [h["status"] for h in order.status_history] == ["paid", "moderation"]
    board = client_for(staff).get("/api/v1/admin/orders/board/").json()
    assert order.order_number not in str(board)
    queue = client_for(staff).get(QUEUE).json()
    assert queue["count"] == 1
    [entry] = queue["orders"]
    assert entry["order_number"] == order.order_number
    [design] = entry["designs"]
    assert design["design_config"]["text"] == CONFIG["text"]
    assert design["design_file_url"].endswith("/design-file/")


def test_the_moderation_queue_authz(user, monkeypatch):
    order = custom_order(user, monkeypatch)
    for client, code in ((APIClient(), 401), (client_for(user), 403)):
        assert client.get(QUEUE).status_code == code
        assert client.post(approve_url(order)).status_code == code
    order.refresh_from_db()
    assert order.status == "moderation"


def test_the_queue_is_oldest_first_and_only_moderation(staff):
    make(1, "moderation", days_ago=1, custom=True)
    make(2, "moderation", days_ago=3, custom=True)
    make(3, "paid", custom=True)
    numbers = [
        o["order_number"][-3:] for o in client_for(staff).get(QUEUE).json()["orders"]
    ]
    assert numbers == ["002", "001"]


def test_approving_moves_the_order_to_shirt_acquired(user, monkeypatch, staff):
    order = custom_order(user, monkeypatch)
    resp = client_for(staff).post(approve_url(order))
    assert resp.status_code == 200 and resp.json()["status"] == "shirt_acquired"
    order.refresh_from_db()
    assert order.status == "shirt_acquired"
    last = order.status_history[-1]
    assert (last["status"], last["by"], last["note"]) == (
        "shirt_acquired",
        "owner@example.com",
        "Design approved",
    )
    assert client_for(staff).get(QUEUE).json()["count"] == 0
    again = client_for(staff).post(approve_url(order))
    assert again.status_code == 400


def test_only_orders_awaiting_moderation_can_be_approved(staff):
    order = make(1, "paid")
    assert client_for(staff).post(approve_url(order)).status_code == 400
    order.refresh_from_db()
    assert order.status == "paid"
    missing = client_for(staff).post(
        f"{QUEUE}00000000-0000-0000-0000-000000000000/approve/"
    )
    assert missing.status_code == 404


def test_moderation_queue_num_queries_are_constant(staff):
    make(1, "moderation", custom=True)
    client = client_for(staff)
    with CaptureQueriesContext(connection) as few:
        client.get(QUEUE)
    for n in range(2, 10):
        make(n, "moderation", custom=True, items=2)
    with CaptureQueriesContext(connection) as many:
        assert client.get(QUEUE).json()["count"] == 9
    assert len(few) == len(many)


def test_the_customer_sees_review_in_progress(user, monkeypatch):
    order = custom_order(user, monkeypatch)
    data = APIClient().get(f"/api/v1/orders/track/{order.tracking_token}/").json()
    assert (data["status"], data["pipeline_step"]) == ("moderation", 0)
    assert timezone.now() - timedelta(minutes=1) < order.created_at
