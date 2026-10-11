import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User
from catalog.models import Category

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


def test_admin_can_create_a_category():
    admin = make_admin()
    resp = auth_client(admin).post(
        "/api/v1/admin/categories/",
        {"name": "New Category", "slug": "new-category"},
        format="json",
    )
    assert resp.status_code == 201
    assert Category.objects.filter(slug="new-category").exists()


def test_admin_can_rename_a_category():
    admin = make_admin()
    category = Category.objects.create(name="Old Name", slug="old-name")
    resp = auth_client(admin).patch(
        f"/api/v1/admin/categories/{category.id}/",
        {"name": "New Name"},
        format="json",
    )
    assert resp.status_code == 200
    category.refresh_from_db()
    assert category.name == "New Name"


def test_admin_can_reorder_a_category():
    admin = make_admin()
    category = Category.objects.create(
        name="Reorderable", slug="reorderable", display_order=5
    )
    resp = auth_client(admin).patch(
        f"/api/v1/admin/categories/{category.id}/",
        {"display_order": 1},
        format="json",
    )
    assert resp.status_code == 200
    category.refresh_from_db()
    assert category.display_order == 1


def test_admin_can_archive_a_category():
    admin = make_admin()
    category = Category.objects.create(name="Archivable", slug="archivable")
    resp = auth_client(admin).patch(
        f"/api/v1/admin/categories/{category.id}/",
        {"is_active": False},
        format="json",
    )
    assert resp.status_code == 200
    category.refresh_from_db()
    assert category.is_active is False


def test_anonymous_request_is_rejected():
    resp = APIClient().get("/api/v1/admin/categories/")
    assert resp.status_code == 401


def test_non_admin_request_is_rejected():
    user = User.objects.create_user(
        email="buyer@example.com",
        password="correct-horse-battery",
        first_name="Ada",
        phone="+2348000000000",
    )
    resp = auth_client(user).get("/api/v1/admin/categories/")
    assert resp.status_code == 403
