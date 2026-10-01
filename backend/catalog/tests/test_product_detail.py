import pytest
from rest_framework.test import APIClient

from catalog.models import Category, Product

pytestmark = pytest.mark.django_db


def make_category(name="Test Category", slug="test-category"):
    return Category.objects.create(name=name, slug=slug)


def test_product_detail_returns_full_fields():
    category = make_category()
    Product.objects.create(
        slogan="cogito ergo sold out",
        slug="cogito",
        category=category,
        price=500000,
        description="100% cotton, 180 GSM. Machine wash cold.",
        shirt_colors=["Black", "White"],
    )

    resp = APIClient().get("/api/v1/products/cogito/")
    assert resp.status_code == 200
    assert resp.data["slogan"] == "cogito ergo sold out"
    assert resp.data["description"] == "100% cotton, 180 GSM. Machine wash cold."
    assert resp.data["shirt_colors"] == ["Black", "White"]


def test_product_detail_404s_for_an_unknown_slug():
    resp = APIClient().get("/api/v1/products/does-not-exist/")
    assert resp.status_code == 404


def test_product_detail_404s_for_an_inactive_product():
    category = make_category()
    Product.objects.create(
        slogan="hidden", slug="hidden", category=category, price=500000, is_active=False
    )
    resp = APIClient().get("/api/v1/products/hidden/")
    assert resp.status_code == 404


def test_related_products_are_from_the_same_category_excluding_self():
    category = make_category()
    other_category = make_category("Other", "other")
    target = Product.objects.create(
        slogan="target", slug="target", category=category, price=500000
    )
    related = Product.objects.create(
        slogan="related", slug="related", category=category, price=500000
    )
    Product.objects.create(
        slogan="different category",
        slug="different",
        category=other_category,
        price=500000,
    )

    resp = APIClient().get(f"/api/v1/products/{target.slug}/")
    related_slugs = [p["slug"] for p in resp.data["related_products"]]
    assert related_slugs == [related.slug]


def test_related_products_caps_at_four():
    category = make_category()
    target = Product.objects.create(
        slogan="target", slug="target", category=category, price=500000
    )
    for i in range(6):
        Product.objects.create(
            slogan=f"related {i}",
            slug=f"related-{i}",
            category=category,
            price=500000,
        )

    resp = APIClient().get(f"/api/v1/products/{target.slug}/")
    assert len(resp.data["related_products"]) == 4
