import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient

from catalog.models import Category, Product

pytestmark = pytest.mark.django_db


def make_category(name="Philosophy", slug="philosophy"):
    return Category.objects.create(name=name, slug=slug)


def make_products(n, category=None, offset=0):
    category = category or make_category()
    for i in range(offset, offset + n):
        Product.objects.create(
            slogan=f"slogan {i}",
            slug=f"slogan-{i}",
            category=category,
            price=500000,
        )


def test_product_list_returns_active_products():
    make_products(3)
    resp = APIClient().get("/api/v1/products/")
    assert resp.status_code == 200
    assert resp.data["count"] == 3


def test_product_list_excludes_inactive_products():
    make_products(2)
    Product.objects.create(
        slogan="hidden",
        slug="hidden",
        category=make_category("Tech", "tech"),
        price=500000,
        is_active=False,
    )
    resp = APIClient().get("/api/v1/products/")
    assert resp.data["count"] == 2


def test_product_list_serializes_card_fields():
    make_products(1)
    resp = APIClient().get("/api/v1/products/")
    item = resp.data["results"][0]
    assert set(item.keys()) >= {
        "slogan",
        "category",
        "price",
        "mockup_images",
        "tags",
    }
    assert item["category"]["name"] == "Philosophy"


def test_product_list_issues_a_constant_query_count_regardless_of_page_size():
    category = make_category()
    make_products(5, category=category)
    with CaptureQueriesContext(connection) as small_page:
        APIClient().get("/api/v1/products/", {"page_size": 2})
    make_products(15, category=category, offset=5)
    with CaptureQueriesContext(connection) as large_page:
        APIClient().get("/api/v1/products/", {"page_size": 20})
    assert len(large_page) == len(small_page)


def test_anonymous_request_is_allowed():
    resp = APIClient().get("/api/v1/products/")
    assert resp.status_code == 200
