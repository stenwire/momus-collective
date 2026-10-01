from datetime import timedelta

import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User

pytestmark = pytest.mark.django_db


def make_user(email="buyer@example.com", password="correct-horse-battery"):
    return User.objects.create_user(
        email=email, password=password, first_name="Ada", phone="+2348000000000"
    )


def test_login_with_correct_credentials_returns_access_and_refresh():
    make_user()
    resp = APIClient().post(
        "/api/v1/auth/login/",
        {"email": "buyer@example.com", "password": "correct-horse-battery"},
    )
    assert resp.status_code == 200
    assert "access" in resp.data
    assert "refresh" in resp.data


def test_login_with_wrong_password_is_rejected():
    make_user()
    resp = APIClient().post(
        "/api/v1/auth/login/",
        {"email": "buyer@example.com", "password": "wrong-password"},
    )
    assert resp.status_code == 401


def test_access_token_authenticates_a_protected_request():
    make_user()
    login = APIClient().post(
        "/api/v1/auth/login/",
        {"email": "buyer@example.com", "password": "correct-horse-battery"},
    )
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
    resp = client.get("/api/v1/health/")
    assert resp.status_code == 200


def test_refresh_token_issues_a_new_access_token():
    make_user()
    login = APIClient().post(
        "/api/v1/auth/login/",
        {"email": "buyer@example.com", "password": "correct-horse-battery"},
    )
    resp = APIClient().post(
        "/api/v1/auth/token/refresh/", {"refresh": login.data["refresh"]}
    )
    assert resp.status_code == 200
    assert "access" in resp.data


def test_remember_me_false_gives_a_session_length_refresh_token():
    make_user()
    resp = APIClient().post(
        "/api/v1/auth/login/",
        {
            "email": "buyer@example.com",
            "password": "correct-horse-battery",
            "remember_me": False,
        },
    )
    token = RefreshToken(resp.data["refresh"])
    lifetime = token["exp"] - token["iat"]
    assert lifetime <= timedelta(hours=12).total_seconds()


def test_remember_me_true_gives_a_thirty_day_refresh_token():
    make_user()
    resp = APIClient().post(
        "/api/v1/auth/login/",
        {
            "email": "buyer@example.com",
            "password": "correct-horse-battery",
            "remember_me": True,
        },
    )
    token = RefreshToken(resp.data["refresh"])
    lifetime = token["exp"] - token["iat"]
    assert lifetime == timedelta(days=30).total_seconds()


def test_remember_me_false_as_json_boolean_gives_session_length_token():
    """The frontend sends real JSON, not form-encoded booleans-as-strings."""
    make_user()
    resp = APIClient().post(
        "/api/v1/auth/login/",
        {
            "email": "buyer@example.com",
            "password": "correct-horse-battery",
            "remember_me": False,
        },
        format="json",
    )
    token = RefreshToken(resp.data["refresh"])
    lifetime = token["exp"] - token["iat"]
    assert lifetime <= timedelta(hours=12).total_seconds()
