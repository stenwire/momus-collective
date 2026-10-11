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


# T-506: rejection, the customer's choice, and FR-NOT-03's messages.

from django.core import mail  # noqa: E402

from designs.storage import design_storage, order_item_file_name  # noqa: E402


@pytest.fixture
def capture(django_capture_on_commit_callbacks):
    def run(fn):
        with django_capture_on_commit_callbacks(execute=True):
            return fn()

    return run


def reject(staff, order, reason="unprintable", details="The text is too small."):
    return client_for(staff).post(
        f"{QUEUE}{order.id}/reject/",
        {"reason": reason, "details": details},
        format="json",
    )


def customer_mail(order):
    return [m for m in mail.outbox if order.order_number in m.subject]


def test_rejection_authz(user, monkeypatch):
    order = custom_order(user, monkeypatch)
    for client, code in ((APIClient(), 401), (client_for(user), 403)):
        resp = client.post(f"{QUEUE}{order.id}/reject/", {"reason": "offensive"})
        assert resp.status_code == code
        assert client.post(f"{QUEUE}{order.id}/refunded/").status_code == code
    order.refresh_from_db()
    assert order.rejected_at is None


def test_a_rejection_records_the_reason_and_tells_the_customer(
    user, monkeypatch, staff, capture
):
    order = custom_order(user, monkeypatch)
    mail.outbox.clear()
    assert capture(lambda: reject(staff, order)).status_code == 200
    order.refresh_from_db()
    assert order.status == "moderation"
    assert (order.rejection_reason, order.rejection_details) == (
        "unprintable",
        "The text is too small.",
    )
    assert order.status_history[-1]["note"] == "Design rejected: Unprintable design"
    queue = client_for(staff).get(QUEUE).json()
    assert queue["count"] == 0 and queue["orders"] == []
    [waiting] = queue["waiting"]
    assert waiting["rejection"]["reason_label"] == "Unprintable design"
    assert waiting["rejection"]["customer_choice"] == ""
    assert [r["key"] for r in queue["reasons"]] == [
        "offensive",
        "copyright",
        "unprintable",
    ]
    [email] = customer_mail(order)
    assert email.to == ["ada@example.com"]
    assert "Reason: Unprintable design" in email.body
    assert "The text is too small." in email.body
    assert f"/track/{order.tracking_token}" in email.body
    track = APIClient().get(f"/api/v1/orders/track/{order.tracking_token}/").json()
    assert track["design_review"] == {
        "reason_label": "Unprintable design",
        "details": "The text is too small.",
        "customer_choice": "",
    }


def test_a_rejection_needs_a_listed_reason_and_a_waiting_order(
    user, monkeypatch, staff
):
    order = custom_order(user, monkeypatch)
    assert reject(staff, order, reason="ugly").status_code == 400
    assert reject(staff, order).status_code == 200
    assert reject(staff, order).status_code == 400
    assert client_for(staff).post(approve_url(order)).status_code == 400


def test_approval_tells_the_customer_once(user, monkeypatch, staff, capture):
    order = custom_order(user, monkeypatch)
    mail.outbox.clear()
    capture(lambda: client_for(staff).post(approve_url(order)))
    [email] = customer_mail(order)
    assert email.subject == f"Your design is approved: order {order.order_number}"
    from notifications.tasks import design_outcome

    design_outcome(str(order.id), "approved")
    assert len(customer_mail(order)) == 1


def refund_request(order):
    return APIClient().post(
        f"/api/v1/orders/track/{order.tracking_token}/refund-request/"
    )


def test_the_customer_can_ask_for_a_refund_and_the_admin_records_it(
    user, monkeypatch, staff
):
    order = custom_order(user, monkeypatch)
    assert refund_request(order).status_code == 400
    reject(staff, order)
    assert refund_request(order).status_code == 204
    assert refund_request(order).status_code == 204
    order.refresh_from_db()
    assert order.customer_choice == "refund"
    assert [h.get("note") for h in order.status_history].count(
        "Customer asked for a refund"
    ) == 1
    waiting = client_for(staff).get(QUEUE).json()["waiting"][0]
    assert waiting["rejection"]["customer_choice"] == "refund"
    resp = client_for(staff).post(f"{QUEUE}{order.id}/refunded/")
    assert resp.json()["status"] == "refunded"
    track = APIClient().get(f"/api/v1/orders/track/{order.tracking_token}/").json()
    assert (track["status"], track["pipeline_step"]) == ("refunded", None)
    assert "design_review" not in track


def revise(order, item, config):
    return APIClient().post(
        f"/api/v1/orders/track/{order.tracking_token}/items/{item.id}/revise/",
        {"config": config},
        format="json",
    )


def test_a_revision_replaces_the_design_and_goes_back_for_review(
    user, monkeypatch, staff, capture, settings, tmp_path
):
    settings.DESIGN_FILES_ROOT = tmp_path / "files"
    order = custom_order(user, monkeypatch)
    item = order.items.get()
    capture(
        lambda: __import__("orders.tasks", fromlist=["x"]).order_paid(str(order.id))
    )
    before = design_storage().open(order_item_file_name(item.id)).read()
    capture(lambda: reject(staff, order))
    new = {**CONFIG, "text": "BIGGER TEXT", "font_size": "large"}
    assert capture(lambda: revise(order, item, new)).status_code == 204
    item.refresh_from_db()
    order.refresh_from_db()
    assert (item.design_config["text"], item.slogan_text) == (
        "BIGGER TEXT",
        "BIGGER TEXT",
    )
    assert order.rejected_at is None and order.rejection_reason == ""
    assert order.status_history[-1]["note"] == "Design revised by the customer"
    after = design_storage().open(order_item_file_name(item.id)).read()
    assert after != before
    queue = client_for(staff).get(QUEUE).json()
    assert queue["count"] == 1 and queue["waiting"] == []
    mail.outbox.clear()
    capture(lambda: reject(staff, order, details="Still too small."))
    assert len(customer_mail(order)) == 1


@pytest.mark.parametrize(
    "change",
    # Navy takes Gold text, so only the colour change itself is refused.
    [{"shirt_color": "Navy"}, {"font": "comic-sans"}, {"text": ""}],
)
def test_a_revision_must_be_a_valid_design_on_the_same_shirt(
    user, monkeypatch, staff, change
):
    order = custom_order(user, monkeypatch)
    item = order.items.get()
    reject(staff, order)
    assert revise(order, item, {**CONFIG, **change}).status_code == 400
    item.refresh_from_db()
    assert item.design_config["text"] == CONFIG["text"]


def test_revisions_only_when_rejected_and_not_refunding(
    user, monkeypatch, staff, product
):
    order = custom_order(user, monkeypatch, with_catalog=product)
    design_item = order.items.get(design_config__isnull=False)
    catalog_item = order.items.get(design_config__isnull=True)
    assert revise(order, design_item, CONFIG).status_code == 400
    reject(staff, order)
    assert revise(order, catalog_item, CONFIG).status_code == 400
    refund_request(order)
    assert revise(order, design_item, CONFIG).status_code == 400
    wrong = APIClient().post(
        f"/api/v1/orders/track/nope/items/{design_item.id}/revise/",
        {"config": CONFIG},
        format="json",
    )
    assert wrong.status_code == 404
