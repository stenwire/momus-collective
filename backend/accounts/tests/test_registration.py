import pytest
from django.core import mail
from rest_framework.test import APIClient

from accounts.models import User
from accounts.tokens import make_email_verification_token

pytestmark = pytest.mark.django_db

VALID_PAYLOAD = {
    "email": "new@example.com",
    "password": "correct-horse-battery",
    "first_name": "Ada",
    "phone": "+2348000000000",
}


def test_registration_succeeds_and_creates_an_unverified_user():
    resp = APIClient().post("/api/v1/auth/register/", VALID_PAYLOAD)
    assert resp.status_code == 201
    user = User.objects.get(email="new@example.com")
    assert user.is_verified is False
    assert user.check_password("correct-horse-battery")


def test_duplicate_email_is_rejected_with_a_clear_message():
    User.objects.create_user(
        email="new@example.com",
        password="an-existing-password",
        first_name="Bo",
        phone="+2348011112222",
    )
    resp = APIClient().post("/api/v1/auth/register/", VALID_PAYLOAD)
    assert resp.status_code == 400
    assert "already exists" in str(resp.data["email"][0])


def test_duplicate_email_rejected_case_insensitively():
    User.objects.create_user(
        email="new@example.com",
        password="an-existing-password",
        first_name="Bo",
        phone="+2348011112222",
    )
    resp = APIClient().post(
        "/api/v1/auth/register/", {**VALID_PAYLOAD, "email": "NEW@EXAMPLE.COM"}
    )
    assert resp.status_code == 400


def test_password_under_eight_characters_is_rejected():
    resp = APIClient().post(
        "/api/v1/auth/register/", {**VALID_PAYLOAD, "password": "short1"}
    )
    assert resp.status_code == 400
    assert "password" in resp.data


def test_registration_sends_a_verification_email():
    APIClient().post("/api/v1/auth/register/", VALID_PAYLOAD)
    assert len(mail.outbox) == 1
    assert "new@example.com" in mail.outbox[0].to


def test_verify_email_marks_the_user_verified():
    user = User.objects.create_user(
        **{**VALID_PAYLOAD, "password": "correct-horse-battery"}
    )
    assert user.is_verified is False
    token = make_email_verification_token(user)
    resp = APIClient().post("/api/v1/auth/verify-email/", {"token": token})
    assert resp.status_code == 200
    user.refresh_from_db()
    assert user.is_verified is True


def test_verify_email_rejects_a_garbage_token():
    resp = APIClient().post("/api/v1/auth/verify-email/", {"token": "not-a-real-token"})
    assert resp.status_code == 400
