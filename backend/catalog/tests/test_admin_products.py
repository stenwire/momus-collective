import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User
from catalog.models import Category, Product

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


def make_category(name="Test Category", slug="test-category"):
    return Category.objects.create(name=name, slug=slug)


def test_admin_can_create_a_product():
    admin = make_admin()
    category = make_category()
    resp = auth_client(admin).post(
        "/api/v1/admin/products/",
        {
            "slogan": "cogito ergo sold out",
            "slug": "cogito",
            "category": str(category.id),
            "price": 500000,
            "mockup_images": ["https://example.com/mockup.png"],
            "tags": ["NEW"],
        },
        format="json",
    )
    assert resp.status_code == 201
    assert Product.objects.filter(slug="cogito").exists()


def test_admin_can_edit_any_field():
    admin = make_admin()
    category = make_category()
    product = Product.objects.create(
        slogan="original", slug="original", category=category, price=500000
    )
    resp = auth_client(admin).patch(
        f"/api/v1/admin/products/{product.id}/",
        {"slogan": "updated", "price": 600000},
        format="json",
    )
    assert resp.status_code == 200
    product.refresh_from_db()
    assert product.slogan == "updated"
    assert product.price == 600000


def test_admin_can_archive_a_product_via_is_active():
    admin = make_admin()
    category = make_category()
    product = Product.objects.create(
        slogan="archivable", slug="archivable", category=category, price=500000
    )
    resp = auth_client(admin).patch(
        f"/api/v1/admin/products/{product.id}/",
        {"is_active": False},
        format="json",
    )
    assert resp.status_code == 200
    product.refresh_from_db()
    assert product.is_active is False


def test_admin_can_delete_a_product():
    admin = make_admin()
    category = make_category()
    product = Product.objects.create(
        slogan="deletable", slug="deletable", category=category, price=500000
    )
    resp = auth_client(admin).delete(f"/api/v1/admin/products/{product.id}/")
    assert resp.status_code == 204
    assert not Product.objects.filter(id=product.id).exists()


def test_admin_can_bulk_update_prices():
    admin = make_admin()
    category = make_category()
    p1 = Product.objects.create(slogan="p1", slug="p1", category=category, price=100000)
    p2 = Product.objects.create(slogan="p2", slug="p2", category=category, price=200000)
    resp = auth_client(admin).post(
        "/api/v1/admin/products/bulk_price/",
        {
            "updates": [
                {"id": str(p1.id), "price": 150000},
                {"id": str(p2.id), "price": 250000},
            ]
        },
        format="json",
    )
    assert resp.status_code == 200
    p1.refresh_from_db()
    p2.refresh_from_db()
    assert p1.price == 150000
    assert p2.price == 250000


def test_bulk_price_rejects_an_invalid_price_and_changes_nothing():
    admin = make_admin()
    category = make_category()
    p1 = Product.objects.create(slogan="p1", slug="p1", category=category, price=100000)
    resp = auth_client(admin).post(
        "/api/v1/admin/products/bulk_price/",
        {"updates": [{"id": str(p1.id), "price": -5}]},
        format="json",
    )
    assert resp.status_code == 400
    p1.refresh_from_db()
    assert p1.price == 100000


def test_admin_can_reorder_products_within_a_category():
    admin = make_admin()
    category = make_category()
    p1 = Product.objects.create(
        slogan="p1", slug="p1", category=category, price=100000, display_order=0
    )
    p2 = Product.objects.create(
        slogan="p2", slug="p2", category=category, price=100000, display_order=1
    )
    resp = auth_client(admin).post(
        "/api/v1/admin/products/reorder/",
        {
            "updates": [
                {"id": str(p1.id), "display_order": 1},
                {"id": str(p2.id), "display_order": 0},
            ]
        },
        format="json",
    )
    assert resp.status_code == 200
    p1.refresh_from_db()
    p2.refresh_from_db()
    assert p1.display_order == 1
    assert p2.display_order == 0


def test_anonymous_request_is_rejected():
    resp = APIClient().get("/api/v1/admin/products/")
    assert resp.status_code == 401


def test_non_admin_request_is_rejected():
    user = User.objects.create_user(
        email="buyer@example.com",
        password="correct-horse-battery",
        first_name="Ada",
        phone="+2348000000000",
    )
    resp = auth_client(user).get("/api/v1/admin/products/")
    assert resp.status_code == 403
