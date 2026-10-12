from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User
from catalog.models import Category, Product
from orders.models import Order, OrderItem
from orders.tests.test_fulfilment import SHIPPING, client_for
from reviews.models import Review

pytestmark = pytest.mark.django_db
_n = iter(range(1, 1000))


@pytest.fixture
def shirt():
    category = Category.objects.create(name="Test Category", slug="test-category")
    return Product.objects.create(
        slogan="touch grass", slug="tg", category=category, price=1
    )


@pytest.fixture
def other_shirt(shirt):
    return Product.objects.create(
        slogan="other", slug="other", category=shirt.category, price=1
    )


def buyer(email="ada@example.com", first="Ada", last="Lovelace"):
    return User.objects.create_user(
        email=email, password="x" * 12, first_name=first, last_name=last, phone="1"
    )


def order(product, user=None, status="delivered", name="Chiamaka Obi"):
    o = Order.objects.create(
        order_number=f"MOM-20261012-{next(_n):03d}",
        user=user,
        guest_email="" if user else "g@example.com",
        guest_phone="" if user else "1",
        shipping_address={**SHIPPING, "full_name": name},
        subtotal=1,
        delivery_fee=0,
        total=1,
        status=status,
    )
    OrderItem.objects.create(
        order=o,
        product=product,
        slogan_text="x",
        size="M",
        color="Black",
        quantity=1,
        unit_price=1,
    )
    return o


def url(product, suffix=""):
    return f"/api/v1/products/{product.slug}/reviews/{suffix}"


def post(client, product, **body):
    return client.post(url(product), {"rating": 5, **body}, format="json")


def test_a_customer_with_a_delivered_order_can_review(shirt):
    ada = buyer()
    order(shirt, ada)
    resp = post(
        client_for(ada), shirt, rating=4, text="  Soft and the print is crisp.  "
    )
    assert resp.status_code == 201
    body = resp.json()
    assert (body["rating"], body["text"], body["reviewer"], body["verified"]) == (
        4,
        "Soft and the print is crisp.",
        "Ada L.",
        True,
    )
    shirt.refresh_from_db()
    assert str(shirt.avg_rating) == "4.00"


@pytest.mark.parametrize("status", ["paid", "printed", "out_for_delivery", "cancelled"])
def test_reviews_open_only_once_delivered(shirt, status):
    ada = buyer()
    order(shirt, ada, status=status)
    resp = post(client_for(ada), shirt)
    assert resp.status_code == 400
    assert "once your order with this shirt is delivered" in resp.json()["detail"]


def test_buying_another_shirt_does_not_count(shirt, other_shirt):
    ada = buyer()
    order(other_shirt, ada)
    assert post(client_for(ada), shirt).status_code == 400


def test_one_review_per_customer_per_shirt(shirt):
    ada = buyer()
    order(shirt, ada)
    order(shirt, ada)
    assert post(client_for(ada), shirt).status_code == 201
    second = post(client_for(ada), shirt)
    assert second.status_code == 400 and "already reviewed" in second.json()["detail"]


def test_a_guest_reviews_with_their_tracking_token(shirt, other_shirt):
    delivered = order(shirt)
    resp = post(APIClient(), shirt, token=delivered.tracking_token, text="Love it")
    assert resp.status_code == 201
    review = Review.objects.get()
    assert review.user is None and review.order == delivered
    assert resp.json()["reviewer"] == "Chiamaka O."
    assert post(APIClient(), shirt, token=delivered.tracking_token).status_code == 400
    assert (
        post(APIClient(), other_shirt, token=delivered.tracking_token).status_code
        == 400
    )
    pending = order(shirt, status="printed")
    assert post(APIClient(), shirt, token=pending.tracking_token).status_code == 400
    assert post(APIClient(), shirt, token="guess").status_code == 400
    assert post(APIClient(), shirt).status_code == 400


@pytest.mark.parametrize(
    "body",
    [
        {"rating": 0},
        {"rating": 6},
        {"rating": 5, "text": "x" * 501},
        {"rating": "great"},
    ],
)
def test_rating_is_one_to_five_and_text_at_most_500(shirt, body):
    ada = buyer()
    order(shirt, ada)
    assert client_for(ada).post(url(shirt), body, format="json").status_code == 400
    assert not Review.objects.exists()


def test_text_is_optional_and_500_is_allowed(shirt):
    ada = buyer()
    order(shirt, ada)
    assert post(client_for(ada), shirt, text="x" * 500).status_code == 201


def test_reviews_list_newest_first_visible_only_with_the_average(shirt):
    for n, (rating, days) in enumerate([(5, 3), (3, 1), (4, 2)]):
        user = buyer(f"u{n}@example.com", f"User{n}", "")
        o = order(shirt, user)
        Review.objects.create(
            product=shirt, order=o, user=user, rating=rating, text=f"r{n}"
        )
        Review.objects.filter(order=o).update(
            created_at=timezone.now() - timedelta(days=days)
        )
    hidden_user = buyer("h@example.com")
    Review.objects.create(
        product=shirt,
        order=order(shirt, hidden_user),
        user=hidden_user,
        rating=1,
        is_visible=False,
    )
    from reviews.services import refresh_rating

    refresh_rating(shirt)
    data = APIClient().get(url(shirt)).json()
    assert [r["text"] for r in data["results"]] == ["r1", "r2", "r0"]
    assert data["results"][0]["reviewer"] == "User1"
    assert (data["count"], data["average"]) == (3, "4.00")


def test_reviews_page_by_ten(shirt):
    for n in range(12):
        user = buyer(f"p{n}@example.com")
        Review.objects.create(
            product=shirt, order=order(shirt, user), user=user, rating=5
        )
    first = APIClient().get(url(shirt)).json()
    assert first["count"] == 12 and len(first["results"]) == 10


def test_eligibility_tells_the_page_whether_to_show_the_form(shirt):
    ada = buyer()
    order(shirt, ada)
    assert client_for(ada).get(url(shirt, "eligibility/")).json() == {
        "can_review": True,
        "reason": "",
    }
    post(client_for(ada), shirt)
    body = client_for(ada).get(url(shirt, "eligibility/")).json()
    assert body["can_review"] is False and "already reviewed" in body["reason"]
    anonymous = APIClient().get(url(shirt, "eligibility/")).json()
    assert anonymous["can_review"] is False
    guest = order(shirt)
    by_token = (
        APIClient()
        .get(url(shirt, "eligibility/"), {"token": guest.tracking_token})
        .json()
    )
    assert by_token["can_review"] is True


def test_only_posting_is_throttled(shirt):
    client = APIClient()
    assert all(client.get(url(shirt)).status_code == 200 for _ in range(65))
    statuses = [post(client, shirt).status_code for _ in range(61)]
    assert statuses[-1] == 429 and set(statuses[:60]) == {400}


def test_an_archived_shirt_has_no_reviews_page(shirt):
    Product.objects.filter(pk=shirt.pk).update(is_active=False)
    assert APIClient().get(url(shirt)).status_code == 404
