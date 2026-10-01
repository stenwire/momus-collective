import pytest
from django.core import mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework.test import APIClient

from accounts.models import User
from accounts.tokens import password_reset_token

pytestmark = pytest.mark.django_db


def make_user(email="buyer@example.com", password="correct-horse-battery"):
    return User.objects.create_user(
        email=email, password=password, first_name="Ada", phone="+2348000000000"
    )


def test_request_reset_for_existing_email_sends_a_working_link():
    user = make_user()
    resp = APIClient().post(
        "/api/v1/auth/password-reset/", {"email": "buyer@example.com"}, format="json"
    )
    assert resp.status_code == 200
    assert len(mail.outbox) == 1
    assert "reset-password" in mail.outbox[0].body

    body = mail.outbox[0].body
    uid = body.split("uid=")[1].split("&")[0]
    token = body.split("token=")[1].strip()

    confirm = APIClient().post(
        "/api/v1/auth/password-reset/confirm/",
        {"uid": uid, "token": token, "password": "a-new-strong-password"},
        format="json",
    )
    assert confirm.status_code == 200
    user.refresh_from_db()
    assert user.check_password("a-new-strong-password")


def test_request_reset_for_unknown_email_gives_same_response_and_sends_nothing():
    resp = APIClient().post(
        "/api/v1/auth/password-reset/",
        {"email": "nobody@example.com"},
        format="json",
    )
    assert resp.status_code == 200
    assert len(mail.outbox) == 0


def test_confirm_reset_rejects_a_garbage_token():
    user = make_user()
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    resp = APIClient().post(
        "/api/v1/auth/password-reset/confirm/",
        {"uid": uid, "token": "not-a-real-token", "password": "a-new-strong-password"},
        format="json",
    )
    assert resp.status_code == 400
    user.refresh_from_db()
    assert user.check_password("correct-horse-battery")


def test_confirm_reset_rejects_a_short_password():
    user = make_user()
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = password_reset_token.make_token(user)
    resp = APIClient().post(
        "/api/v1/auth/password-reset/confirm/",
        {"uid": uid, "token": token, "password": "short"},
        format="json",
    )
    assert resp.status_code == 400


def test_reset_token_is_invalidated_by_a_prior_password_change():
    user = make_user()
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = password_reset_token.make_token(user)

    user.set_password("changed-in-the-meantime")
    user.save(update_fields=["password"])

    resp = APIClient().post(
        "/api/v1/auth/password-reset/confirm/",
        {"uid": uid, "token": token, "password": "a-new-strong-password"},
        format="json",
    )
    assert resp.status_code == 400
