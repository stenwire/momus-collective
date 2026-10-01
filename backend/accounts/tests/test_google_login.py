from unittest.mock import patch

import pytest
from rest_framework.test import APIClient

from accounts.models import AuthProvider, User

pytestmark = pytest.mark.django_db


def google_claims(email="newuser@example.com", email_verified=True, **overrides):
    claims = {
        "email": email,
        "email_verified": email_verified,
        "given_name": "Ada",
        "family_name": "Lovelace",
    }
    claims.update(overrides)
    return claims


@patch("accounts.auth_views.google_id_token.verify_oauth2_token")
def test_google_login_creates_a_verified_user(mock_verify):
    mock_verify.return_value = google_claims()
    resp = APIClient().post(
        "/api/v1/auth/login/google/", {"credential": "token"}, format="json"
    )
    assert resp.status_code == 200
    assert "access" in resp.data
    assert "refresh" in resp.data
    user = User.objects.get(email="newuser@example.com")
    assert user.is_verified is True
    assert user.auth_provider == AuthProvider.GOOGLE


@patch("accounts.auth_views.google_id_token.verify_oauth2_token")
def test_google_login_links_an_existing_email_account(mock_verify):
    User.objects.create_user(
        email="buyer@example.com",
        password="correct-horse-battery",
        first_name="Ada",
        phone="+2348000000000",
    )
    mock_verify.return_value = google_claims(email="buyer@example.com")
    resp = APIClient().post(
        "/api/v1/auth/login/google/", {"credential": "token"}, format="json"
    )
    assert resp.status_code == 200
    user = User.objects.get(email="buyer@example.com")
    assert user.auth_provider == AuthProvider.GOOGLE
    assert user.is_verified is True
    assert User.objects.filter(email__iexact="buyer@example.com").count() == 1


@patch("accounts.auth_views.google_id_token.verify_oauth2_token")
def test_google_login_rejects_an_unverified_google_email(mock_verify):
    mock_verify.return_value = google_claims(email_verified=False)
    resp = APIClient().post(
        "/api/v1/auth/login/google/", {"credential": "token"}, format="json"
    )
    assert resp.status_code == 401
    assert not User.objects.filter(email="newuser@example.com").exists()


@patch("accounts.auth_views.google_id_token.verify_oauth2_token")
def test_google_login_rejects_an_invalid_credential(mock_verify):
    mock_verify.side_effect = ValueError("Token used too early")
    resp = APIClient().post(
        "/api/v1/auth/login/google/", {"credential": "bad-token"}, format="json"
    )
    assert resp.status_code == 401


def test_google_login_requires_a_credential():
    resp = APIClient().post("/api/v1/auth/login/google/", {}, format="json")
    assert resp.status_code == 400


@patch("accounts.auth_views.google_id_token.verify_oauth2_token")
def test_google_login_remember_me_true_gives_thirty_day_refresh(mock_verify):
    from datetime import timedelta

    from rest_framework_simplejwt.tokens import RefreshToken

    mock_verify.return_value = google_claims()
    resp = APIClient().post(
        "/api/v1/auth/login/google/",
        {"credential": "token", "remember_me": True},
        format="json",
    )
    token = RefreshToken(resp.data["refresh"])
    lifetime = token["exp"] - token["iat"]
    assert lifetime == timedelta(days=30).total_seconds()
