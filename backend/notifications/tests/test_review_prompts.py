import re
from datetime import timedelta
from urllib.parse import parse_qs, urlparse

import pytest
from django.conf import settings
from django.core import mail
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User
from catalog.models import Category, Product
from notifications.tasks import send_review_prompts
from orders.models import Order, OrderItem
from orders.tests.test_fulfilment import SHIPPING, client_for
from reviews.models import Review

pytestmark = pytest.mark.django_db
_n = iter(range(1, 1000))


@pytest.fixture
def shirts():
    category = Category.objects.create(name="Test Category", slug="test-category")
    return [
        Product.objects.create(slogan=s, slug=s, category=category, price=1)
        for s in ("touch-grass", "naps")
    ]


def delivered(products, days_ago=4, custom=False, user=None):
    o = Order.objects.create(
        order_number=f"MOM-20261012-{next(_n):03d}",
        user=user,
        guest_email="" if user else "g@example.com",
        guest_phone="" if user else "1",
        shipping_address=SHIPPING,
        subtotal=1,
        delivery_fee=0,
        total=1,
        status="delivered",
        delivered_at=timezone.now() - timedelta(days=days_ago),
    )
    for p in products:
        OrderItem.objects.create(
            order=o,
            product=p,
            slogan_text="x",
            size="M",
            color="Black",
            quantity=1,
            unit_price=1,
        )
    if custom:
        OrderItem.objects.create(
            order=o,
            slogan_text="mine",
            size="L",
            color="Black",
            quantity=1,
            unit_price=1,
            design_config={"text": "mine"},
        )
    return o


def prompts(order):
    return [m for m in mail.outbox if order.order_number in m.subject]


def test_a_prompt_goes_three_days_after_delivery_with_a_link_per_shirt(shirts):
    order = delivered(shirts)
    assert send_review_prompts() == 1
    [email] = prompts(order)
    assert email.to == ["g@example.com"]
    assert email.subject == f"How's your shirt? Review order {order.order_number}"
    urls = re.findall(r"http\S+#reviews", email.body)
    assert [urlparse(u).path for u in urls] == ["/product/touch-grass", "/product/naps"]
    assert all(
        parse_qs(urlparse(u).query)["review"] == [order.tracking_token] for u in urls
    )


def test_the_link_opens_the_review_form(shirts):
    order = delivered(shirts[:1])
    send_review_prompts()
    url = re.findall(r"http\S+#reviews", prompts(order)[0].body)[0]
    token = parse_qs(urlparse(url).query)["review"][0]
    body = (
        APIClient()
        .get("/api/v1/products/touch-grass/reviews/eligibility/", {"token": token})
        .json()
    )
    assert body["can_review"] is True


def test_not_before_three_days_and_only_once(shirts):
    early = delivered(shirts, days_ago=2)
    due = delivered(shirts, days_ago=3)
    assert send_review_prompts() == 1
    assert send_review_prompts() == 0
    assert prompts(early) == [] and len(prompts(due)) == 1


def test_already_reviewed_shirts_are_left_out(shirts):
    ada = User.objects.create_user(
        email="ada@example.com", password="x" * 12, phone="1"
    )
    order = delivered(shirts, user=ada)
    Review.objects.create(product=shirts[0], order=order, user=ada, rating=5)
    send_review_prompts()
    [email] = prompts(order)
    assert email.to == ["ada@example.com"]
    assert "touch-grass" not in email.body and "/product/naps" in email.body


def test_nothing_to_review_means_no_email(shirts):
    all_reviewed = delivered(shirts[:1])
    Review.objects.create(product=shirts[0], order=all_reviewed, rating=4)
    custom_only = delivered([], custom=True)
    assert send_review_prompts() == 0
    assert prompts(all_reviewed) == [] and prompts(custom_only) == []


def test_moving_to_delivered_starts_the_clock_and_moving_back_stops_it(shirts):
    staff = client_for(
        User.objects.create_user(
            email="o@example.com", password="x" * 12, phone="1", is_staff=True
        )
    )
    order = delivered(shirts, days_ago=10)
    Order.objects.filter(pk=order.pk).update(
        status="out_for_delivery", delivered_at=None
    )
    url = f"/api/v1/admin/orders/{order.id}/status/"
    staff.patch(url, {"status": "delivered"}, format="json")
    order.refresh_from_db()
    assert timezone.now() - order.delivered_at < timedelta(minutes=1)
    assert send_review_prompts() == 0
    staff.patch(url, {"status": "out_for_delivery"}, format="json")
    order.refresh_from_db()
    assert order.delivered_at is None


def test_the_job_runs_hourly():
    entry = settings.CELERY_BEAT_SCHEDULE["review-prompts"]
    assert (entry["task"], entry["schedule"]) == (
        "notifications.tasks.send_review_prompts",
        3600,
    )
