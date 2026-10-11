import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient

from catalog.models import Category, Product

# FR-CAT-02's exact launch list, order included.
LAUNCH_CATEGORIES = [
    "Philosophy",
    "Self-Aware",
    "Tech",
    "Geopolitics",
    "Pop Culture",
    "Dad Jokes",
    "Engineering",
    "Relationships",
    "Religion",
    "Hot Takes",
    "Chaotic",
]

pytestmark = pytest.mark.django_db


def test_launch_migration_seeds_all_11_categories_in_order():
    names = list(
        Category.objects.order_by("display_order").values_list("name", flat=True)
    )
    assert names == LAUNCH_CATEGORIES


def test_category_list_reports_per_category_and_all_counts():
    philosophy = Category.objects.get(slug="philosophy")
    tech = Category.objects.get(slug="tech")
    for i in range(3):
        Product.objects.create(
            slogan=f"p{i}", slug=f"p{i}", category=philosophy, price=500000
        )
    Product.objects.create(slogan="t0", slug="t0", category=tech, price=500000)
    Product.objects.create(
        slogan="hidden", slug="hidden", category=tech, price=500000, is_active=False
    )

    resp = APIClient().get("/api/v1/categories/")
    assert resp.status_code == 200
    assert resp.data["all_count"] == 4

    by_slug = {c["slug"]: c["product_count"] for c in resp.data["categories"]}
    assert by_slug["philosophy"] == 3
    assert by_slug["tech"] == 1


def test_category_list_issues_a_constant_small_query_count():
    with CaptureQueriesContext(connection) as queries:
        APIClient().get("/api/v1/categories/")
    assert len(queries) <= 3


def test_product_list_filters_by_category_slug():
    philosophy = Category.objects.get(slug="philosophy")
    tech = Category.objects.get(slug="tech")
    Product.objects.create(slogan="phi", slug="phi", category=philosophy, price=500000)
    Product.objects.create(slogan="tec", slug="tec", category=tech, price=500000)

    resp = APIClient().get("/api/v1/products/", {"category": "tech"})
    assert resp.data["count"] == 1
    assert resp.data["results"][0]["slogan"] == "tec"
