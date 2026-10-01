import pytest
from rest_framework.test import APIClient

from accounts.models import User

pytestmark = pytest.mark.django_db


def make_user(email="buyer@example.com", password="correct-horse-battery"):
    return User.objects.create_user(
        email=email, password=password, first_name="Ada", phone="+2348000000000"
    )


def test_login_is_throttled_after_the_configured_rate(settings):
    settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]["auth-login"] = "3/min"
    make_user()
    client = APIClient()
    for _ in range(3):
        resp = client.post(
            "/api/v1/auth/login/",
            {"email": "buyer@example.com", "password": "wrong"},
        )
        assert resp.status_code == 401
    throttled = client.post(
        "/api/v1/auth/login/",
        {"email": "buyer@example.com", "password": "wrong"},
    )
    assert throttled.status_code == 429


def test_register_is_throttled_after_the_configured_rate(settings):
    settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]["auth-register"] = "2/min"
    client = APIClient()
    for i in range(2):
        client.post(
            "/api/v1/auth/register/",
            {
                "email": f"user{i}@example.com",
                "password": "correct-horse-battery",
                "first_name": "Ada",
                "phone": "+2348000000000",
            },
        )
    throttled = client.post(
        "/api/v1/auth/register/",
        {
            "email": "user-overflow@example.com",
            "password": "correct-horse-battery",
            "first_name": "Ada",
            "phone": "+2348000000000",
        },
    )
    assert throttled.status_code == 429


def test_password_reset_request_is_throttled_after_the_configured_rate(settings):
    settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]["auth-password-reset"] = "2/min"
    make_user()
    client = APIClient()
    for _ in range(2):
        resp = client.post(
            "/api/v1/auth/password-reset/", {"email": "buyer@example.com"}
        )
        assert resp.status_code == 200
    throttled = client.post(
        "/api/v1/auth/password-reset/", {"email": "buyer@example.com"}
    )
    assert throttled.status_code == 429


def test_login_throttle_is_scoped_per_endpoint_not_global(settings):
    """A client who exhausts the login scope can still hit an unrelated,
    unthrottled endpoint -- the limiter targets specific auth surfaces,
    not all traffic from that client."""
    settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]["auth-login"] = "1/min"
    make_user()
    client = APIClient()
    client.post(
        "/api/v1/auth/login/",
        {"email": "buyer@example.com", "password": "wrong"},
    )
    throttled = client.post(
        "/api/v1/auth/login/",
        {"email": "buyer@example.com", "password": "wrong"},
    )
    assert throttled.status_code == 429

    health = client.get("/api/v1/health/")
    assert health.status_code == 200
