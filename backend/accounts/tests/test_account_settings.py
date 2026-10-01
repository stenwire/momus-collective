import pytest
from django.core import mail
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import NotificationPref, User

pytestmark = pytest.mark.django_db


def make_user(email="buyer@example.com", password="correct-horse-battery"):
    return User.objects.create_user(
        email=email, password=password, first_name="Ada", phone="+2348000000000"
    )


def auth_client(user):
    client = APIClient()
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return client


def test_get_account_settings_returns_the_current_user():
    user = make_user()
    resp = auth_client(user).get("/api/v1/account/")
    assert resp.status_code == 200
    assert resp.data["email"] == "buyer@example.com"


def test_patch_updates_name_phone_and_notification_pref_immediately():
    user = make_user()
    resp = auth_client(user).patch(
        "/api/v1/account/",
        {
            "first_name": "Grace",
            "phone": "+2348111111111",
            "notification_pref": NotificationPref.WHATSAPP,
        },
        format="json",
    )
    assert resp.status_code == 200
    user.refresh_from_db()
    assert user.first_name == "Grace"
    assert user.phone == "+2348111111111"
    assert user.notification_pref == NotificationPref.WHATSAPP


def test_patch_cannot_change_email_directly():
    user = make_user()
    resp = auth_client(user).patch(
        "/api/v1/account/", {"email": "new@example.com"}, format="json"
    )
    assert resp.status_code == 200
    user.refresh_from_db()
    assert user.email == "buyer@example.com"


def test_email_change_requires_confirmation_before_it_takes_effect():
    user = make_user()
    client = auth_client(user)
    resp = client.post(
        "/api/v1/account/email/", {"new_email": "new@example.com"}, format="json"
    )
    assert resp.status_code == 200
    user.refresh_from_db()
    assert user.email == "buyer@example.com"
    assert len(mail.outbox) == 1
    assert mail.outbox[0].to == ["new@example.com"]

    token = mail.outbox[0].body.split("token=")[1].strip()
    confirm = client.post(
        "/api/v1/account/email/confirm/", {"token": token}, format="json"
    )
    assert confirm.status_code == 200
    user.refresh_from_db()
    assert user.email == "new@example.com"


def test_email_change_request_rejects_an_email_already_in_use():
    make_user("taken@example.com")
    user = make_user("buyer@example.com")
    resp = auth_client(user).post(
        "/api/v1/account/email/", {"new_email": "taken@example.com"}, format="json"
    )
    assert resp.status_code == 400
    assert len(mail.outbox) == 0


def test_email_change_confirm_rejects_another_users_token():
    from accounts.tokens import make_email_change_token

    victim = make_user("victim@example.com")
    attacker = make_user("attacker@example.com")
    token = make_email_change_token(victim, "stolen@example.com")

    resp = auth_client(attacker).post(
        "/api/v1/account/email/confirm/", {"token": token}, format="json"
    )
    assert resp.status_code == 400
    victim.refresh_from_db()
    assert victim.email == "victim@example.com"


def test_password_change_requires_the_current_password():
    user = make_user()
    client = auth_client(user)
    resp = client.post(
        "/api/v1/account/password/",
        {"current_password": "wrong-password", "new_password": "a-new-strong-pass"},
        format="json",
    )
    assert resp.status_code == 400
    user.refresh_from_db()
    assert user.check_password("correct-horse-battery")


def test_password_change_succeeds_with_the_correct_current_password():
    user = make_user()
    client = auth_client(user)
    resp = client.post(
        "/api/v1/account/password/",
        {
            "current_password": "correct-horse-battery",
            "new_password": "a-new-strong-pass",
        },
        format="json",
    )
    assert resp.status_code == 200
    user.refresh_from_db()
    assert user.check_password("a-new-strong-pass")


def test_anonymous_request_is_rejected():
    resp = APIClient().get("/api/v1/account/")
    assert resp.status_code == 401
