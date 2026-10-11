from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from catalog.models import Category, Product

pytestmark = pytest.mark.django_db


def make_category(name="Test Category", slug="test-category"):
    return Category.objects.create(name=name, slug=slug)


def test_default_sort_is_newest_first():
    category = make_category()
    older = Product.objects.create(
        slogan="older", slug="older", category=category, price=500000
    )
    newer = Product.objects.create(
        slogan="newer", slug="newer", category=category, price=500000
    )
    # created_at is auto_now_add; force an explicit gap so ordering is
    # deterministic rather than relying on insert speed.
    Product.objects.filter(pk=older.pk).update(
        created_at=timezone.now() - timedelta(days=1)
    )

    resp = APIClient().get("/api/v1/products/")
    slugs = [p["slug"] for p in resp.data["results"]]
    assert slugs == [newer.slug, older.slug]


def test_sort_price_asc():
    category = make_category()
    Product.objects.create(
        slogan="expensive", slug="expensive", category=category, price=900000
    )
    Product.objects.create(
        slogan="cheap", slug="cheap", category=category, price=100000
    )
    resp = APIClient().get("/api/v1/products/", {"sort": "price_asc"})
    slugs = [p["slug"] for p in resp.data["results"]]
    assert slugs == ["cheap", "expensive"]


def test_sort_price_desc():
    category = make_category()
    Product.objects.create(
        slogan="expensive", slug="expensive", category=category, price=900000
    )
    Product.objects.create(
        slogan="cheap", slug="cheap", category=category, price=100000
    )
    resp = APIClient().get("/api/v1/products/", {"sort": "price_desc"})
    slugs = [p["slug"] for p in resp.data["results"]]
    assert slugs == ["expensive", "cheap"]


def test_sort_popular():
    category = make_category()
    Product.objects.create(
        slogan="niche", slug="niche", category=category, price=500000, total_orders=2
    )
    Product.objects.create(
        slogan="hit", slug="hit", category=category, price=500000, total_orders=50
    )
    resp = APIClient().get("/api/v1/products/", {"sort": "popular"})
    slugs = [p["slug"] for p in resp.data["results"]]
    assert slugs == ["hit", "niche"]


def test_unknown_sort_value_falls_back_to_newest():
    category = make_category()
    Product.objects.create(slogan="a", slug="a", category=category, price=500000)
    resp = APIClient().get("/api/v1/products/", {"sort": "not-a-real-option"})
    assert resp.status_code == 200
    assert resp.data["count"] == 1
