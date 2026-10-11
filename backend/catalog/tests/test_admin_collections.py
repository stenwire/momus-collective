import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User
from catalog.models import Category, Collection, CollectionProduct, Product

pytestmark = pytest.mark.django_db


def make_admin():
    return User.objects.create_user(
        email="admin@example.com",
        password="correct-horse-battery",
        first_name="Admin",
        phone="+2348000000000",
        is_staff=True,
    )


def auth_client(user):
    client = APIClient()
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return client


def make_product(slug="p1"):
    category = Category.objects.create(name="Test Category", slug="test-category")
    return Product.objects.create(
        slogan=slug, slug=slug, category=category, price=500000
    )


def test_admin_can_create_a_collection():
    admin = make_admin()
    resp = auth_client(admin).post(
        "/api/v1/admin/collections/",
        {"name": "New Drops", "slug": "new-drops"},
        format="json",
    )
    assert resp.status_code == 201
    assert Collection.objects.filter(slug="new-drops").exists()


def test_admin_can_set_featured_and_display_order():
    admin = make_admin()
    collection = Collection.objects.create(name="Bestsellers", slug="bestsellers")
    resp = auth_client(admin).patch(
        f"/api/v1/admin/collections/{collection.id}/",
        {"is_featured": True, "display_order": 2},
        format="json",
    )
    assert resp.status_code == 200
    collection.refresh_from_db()
    assert collection.is_featured is True
    assert collection.display_order == 2


def test_admin_can_add_a_product_to_a_collection():
    admin = make_admin()
    collection = Collection.objects.create(name="New Drops", slug="new-drops")
    product = make_product()
    resp = auth_client(admin).post(
        f"/api/v1/admin/collections/{collection.id}/add_product/",
        {"product_id": str(product.id)},
        format="json",
    )
    assert resp.status_code == 201
    assert CollectionProduct.objects.filter(
        collection=collection, product=product
    ).exists()


def test_adding_the_same_product_twice_is_not_an_error():
    admin = make_admin()
    collection = Collection.objects.create(name="New Drops", slug="new-drops")
    product = make_product()
    client = auth_client(admin)
    client.post(
        f"/api/v1/admin/collections/{collection.id}/add_product/",
        {"product_id": str(product.id)},
        format="json",
    )
    resp = client.post(
        f"/api/v1/admin/collections/{collection.id}/add_product/",
        {"product_id": str(product.id)},
        format="json",
    )
    assert resp.status_code == 200
    assert (
        CollectionProduct.objects.filter(collection=collection, product=product).count()
        == 1
    )


def test_admin_can_remove_a_product_from_a_collection():
    admin = make_admin()
    collection = Collection.objects.create(name="New Drops", slug="new-drops")
    product = make_product()
    CollectionProduct.objects.create(collection=collection, product=product)
    resp = auth_client(admin).post(
        f"/api/v1/admin/collections/{collection.id}/remove_product/",
        {"product_id": str(product.id)},
        format="json",
    )
    assert resp.status_code == 204
    assert not CollectionProduct.objects.filter(
        collection=collection, product=product
    ).exists()


def test_removing_a_product_not_in_the_collection_404s():
    admin = make_admin()
    collection = Collection.objects.create(name="New Drops", slug="new-drops")
    product = make_product()
    resp = auth_client(admin).post(
        f"/api/v1/admin/collections/{collection.id}/remove_product/",
        {"product_id": str(product.id)},
        format="json",
    )
    assert resp.status_code == 404


def test_anonymous_request_is_rejected():
    resp = APIClient().get("/api/v1/admin/collections/")
    assert resp.status_code == 401


def test_non_admin_request_is_rejected():
    user = User.objects.create_user(
        email="buyer@example.com",
        password="correct-horse-battery",
        first_name="Ada",
        phone="+2348000000000",
    )
    resp = auth_client(user).get("/api/v1/admin/collections/")
    assert resp.status_code == 403
