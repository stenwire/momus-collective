import pytest
from rest_framework.test import APIClient

from catalog.models import Category, Collection, CollectionProduct, Product

pytestmark = pytest.mark.django_db


def make_category(name="Test Category", slug="test-category"):
    return Category.objects.create(name=name, slug=slug)


def make_product(category, slug):
    return Product.objects.create(
        slogan=slug, slug=slug, category=category, price=500000
    )


def test_collection_list_returns_active_collections_with_products():
    category = make_category()
    collection = Collection.objects.create(name="New Drops", slug="new-drops")
    p1 = make_product(category, "p1")
    p2 = make_product(category, "p2")
    CollectionProduct.objects.create(collection=collection, product=p1, display_order=1)
    CollectionProduct.objects.create(collection=collection, product=p2, display_order=0)

    resp = APIClient().get("/api/v1/collections/")
    assert resp.status_code == 200
    assert len(resp.data) == 1
    assert resp.data[0]["name"] == "New Drops"
    slugs = [p["slug"] for p in resp.data[0]["products"]]
    assert slugs == ["p2", "p1"]


def test_collection_list_excludes_inactive_collections():
    Collection.objects.create(name="Hidden", slug="hidden", is_active=False)
    resp = APIClient().get("/api/v1/collections/")
    assert resp.data == []


def test_collection_excludes_inactive_products():
    category = make_category()
    collection = Collection.objects.create(name="New Drops", slug="new-drops")
    active = make_product(category, "active")
    inactive = Product.objects.create(
        slogan="hidden", slug="hidden", category=category, price=500000, is_active=False
    )
    CollectionProduct.objects.create(collection=collection, product=active)
    CollectionProduct.objects.create(collection=collection, product=inactive)

    resp = APIClient().get("/api/v1/collections/")
    slugs = [p["slug"] for p in resp.data[0]["products"]]
    assert slugs == ["active"]


def test_a_product_can_belong_to_multiple_collections():
    category = make_category()
    product = make_product(category, "versatile")
    c1 = Collection.objects.create(name="New Drops", slug="new-drops")
    c2 = Collection.objects.create(name="Bestsellers", slug="bestsellers")
    CollectionProduct.objects.create(collection=c1, product=product)
    CollectionProduct.objects.create(collection=c2, product=product)

    resp = APIClient().get("/api/v1/collections/")
    names = {c["name"] for c in resp.data}
    assert names == {"New Drops", "Bestsellers"}
    for collection in resp.data:
        assert collection["products"][0]["slug"] == "versatile"
