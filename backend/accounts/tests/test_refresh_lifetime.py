from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User

pytestmark = pytest.mark.django_db

HOUR = 3600


@pytest.fixture
def user():
    return User.objects.create_user(
        email="ada@example.com",
        password="correct-horse-battery",
        first_name="A",
        phone="1",
    )


def login(remember):
    return (
        APIClient()
        .post(
            "/api/v1/auth/login/",
            {
                "email": "ada@example.com",
                "password": "correct-horse-battery",
                "remember_me": remember,
            },
            format="json",
        )
        .json()
    )


def refresh(raw):
    return APIClient().post(
        "/api/v1/auth/token/refresh/", {"refresh": raw}, format="json"
    )


def lifetime_hours(raw):
    token = RefreshToken(raw)
    return round((token["exp"] - token["iat"]) / HOUR)


def test_a_session_only_login_stays_twelve_hours_after_refresh(user):
    resp = refresh(login(remember=False)["refresh"])
    assert resp.status_code == 200
    assert lifetime_hours(resp.json()["refresh"]) == 12


def test_a_remembered_login_stays_thirty_days_after_refresh(user):
    resp = refresh(login(remember=True)["refresh"])
    assert lifetime_hours(resp.json()["refresh"]) == 30 * 24


def test_lifetime_holds_across_repeated_rotations(user):
    raw = login(remember=False)["refresh"]
    for _ in range(3):
        raw = refresh(raw).json()["refresh"]
    assert lifetime_hours(raw) == 12


@pytest.mark.parametrize("hours", [12, 30 * 24])
def test_tokens_issued_before_the_remember_claim_keep_their_lifetime(user, hours):
    legacy = RefreshToken.for_user(user)
    legacy.set_exp(from_time=timezone.now(), lifetime=timedelta(hours=hours))
    assert "remember" not in legacy
    resp = refresh(str(legacy))
    assert lifetime_hours(resp.json()["refresh"]) == hours


def test_the_response_contract_is_unchanged(user):
    raw = login(remember=True)["refresh"]
    first = refresh(raw)
    assert first.status_code == 200
    assert sorted(first.json()) == ["access", "refresh"]
    reused = refresh(raw)
    assert reused.status_code == 401
    assert reused.json() == {
        "detail": "Token is blacklisted",
        "code": "token_not_valid",
    }
    junk = refresh("junk")
    assert junk.status_code == 401
    assert junk.json() == {"detail": "Token is invalid", "code": "token_not_valid"}
    missing = APIClient().post("/api/v1/auth/token/refresh/", {}, format="json")
    assert missing.status_code == 400
    assert missing.json() == {"refresh": ["This field is required."]}


def test_the_new_access_token_works(user):
    access = refresh(login(remember=True)["refresh"]).json()["access"]
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
    assert client.get("/api/v1/account/").status_code == 200
