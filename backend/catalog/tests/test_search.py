import pytest
from rest_framework.test import APIClient

from catalog.models import Category, Product

pytestmark = pytest.mark.django_db


def make_category(name="Test Category", slug="test-category"):
    return Category.objects.create(name=name, slug=slug)


def test_search_matches_slogan_text():
    category = make_category()
    Product.objects.create(
        slogan="cogito ergo sold out", slug="cogito", category=category, price=500000
    )
    Product.objects.create(
        slogan="unrelated phrase", slug="unrelated", category=category, price=500000
    )

    resp = APIClient().get("/api/v1/products/", {"search": "cogito"})
    assert resp.data["count"] == 1
    assert resp.data["results"][0]["slug"] == "cogito"


def test_search_matches_category_name():
    tech = Category.objects.get(slug="tech")
    philosophy = make_category()
    Product.objects.create(
        slogan="binary thoughts", slug="binary", category=tech, price=500000
    )
    Product.objects.create(
        slogan="binary opposites", slug="binary2", category=philosophy, price=500000
    )

    resp = APIClient().get("/api/v1/products/", {"search": "tech"})
    assert resp.data["count"] == 1
    assert resp.data["results"][0]["slug"] == "binary"


def test_search_is_case_insensitive():
    category = make_category()
    Product.objects.create(
        slogan="Cogito Ergo Sold Out", slug="cogito", category=category, price=500000
    )
    resp = APIClient().get("/api/v1/products/", {"search": "COGITO"})
    assert resp.data["count"] == 1


def test_search_with_no_matches_returns_empty_results():
    resp = APIClient().get("/api/v1/products/", {"search": "nonexistent phrase xyz"})
    assert resp.status_code == 200
    assert resp.data["count"] == 0
    assert resp.data["results"] == []


def test_search_combines_with_category_filter():
    tech = Category.objects.get(slug="tech")
    philosophy = make_category()
    Product.objects.create(
        slogan="binary thoughts", slug="binary", category=tech, price=500000
    )
    Product.objects.create(
        slogan="binary opposites", slug="binary2", category=philosophy, price=500000
    )

    resp = APIClient().get(
        "/api/v1/products/", {"search": "binary", "category": "tech"}
    )
    assert resp.data["count"] == 1
    assert resp.data["results"][0]["slug"] == "binary"
