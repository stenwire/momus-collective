import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User

pytestmark = pytest.mark.django_db


def auth_client(user):
    client = APIClient()
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return client


def test_admin_route_401s_for_an_anonymous_request():
    resp = APIClient().get("/api/v1/admin/ping/")
    assert resp.status_code == 401


def test_admin_route_403s_for_an_authenticated_non_admin():
    user = User.objects.create_user(
        email="buyer@example.com",
        password="correct-horse-battery",
        first_name="Ada",
        phone="+2348000000000",
    )
    resp = auth_client(user).get("/api/v1/admin/ping/")
    assert resp.status_code == 403


def test_admin_route_200s_for_an_is_staff_user():
    admin = User.objects.create_user(
        email="admin@example.com",
        password="correct-horse-battery",
        first_name="Admin",
        phone="+2348000000000",
        is_staff=True,
    )
    resp = auth_client(admin).get("/api/v1/admin/ping/")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}
