import pytest
from rest_framework.test import APIClient

from catalog.models import Collection, Product
from reviews.models import Review
from reviews.services import refresh_rating
from reviews.tests.test_reviews_api import buyer, order

pytestmark = pytest.mark.django_db
_n = iter(range(1, 1000))


def rate(product, *ratings, visible=True):
    for rating in ratings:
        n = next(_n)
        user = buyer(f"t{n}@example.com", f"T{n}", "")
        Review.objects.create(
            product=product,
            order=order(product, user),
            user=user,
            rating=rating,
            is_visible=visible,
        )
    refresh_rating(product)


def make(shirt, slug, *ratings):
    p = Product.objects.create(slogan=slug, slug=slug, category=shirt.category, price=1)
    if ratings:
        rate(p, *ratings)
    return p


def top_rated():
    return next(
        (
            c
            for c in APIClient().get("/api/v1/collections/").json()
            if c["slug"] == "top-rated"
        ),
        None,
    )


def test_the_count_follows_visible_reviews(shirt):
    rate(shirt, 5, 3)
    rate(shirt, 1, visible=False)
    shirt.refresh_from_db()
    assert (str(shirt.avg_rating), shirt.review_count) == ("4.00", 2)
    card = APIClient().get("/api/v1/products/").json()["results"][0]
    assert (card["avg_rating"], card["review_count"]) == ("4.00", 2)


def test_top_rated_orders_by_average_then_count_and_skips_unreviewed(shirt):
    make(shirt, "five-once", 5)
    make(shirt, "five-twice", 5, 5)
    make(shirt, "three", 3)
    make(shirt, "unreviewed")
    hidden = make(shirt, "archived", 5, 5, 5)
    Product.objects.filter(pk=hidden.pk).update(is_active=False)
    collection = top_rated()
    assert collection["name"] == "Top Rated"
    assert [p["slug"] for p in collection["products"]] == [
        "five-twice",
        "five-once",
        "three",
    ]


def test_top_rated_holds_eight_and_follows_admin_collections(shirt):
    Collection.objects.create(name="Featured", slug="featured", is_active=True)
    for n in range(10):
        make(shirt, f"s{n}", 4)
    slugs = [c["slug"] for c in APIClient().get("/api/v1/collections/").json()]
    assert slugs == ["featured", "top-rated"]
    assert len(top_rated()["products"]) == 8


def test_no_top_rated_until_something_is_reviewed(shirt):
    assert top_rated() is None


def test_the_shop_sorts_by_top_rated(shirt):
    make(shirt, "low", 2)
    make(shirt, "high", 5)
    results = (
        APIClient().get("/api/v1/products/", {"sort": "top_rated"}).json()["results"]
    )
    assert [p["slug"] for p in results][:2] == ["high", "low"]
