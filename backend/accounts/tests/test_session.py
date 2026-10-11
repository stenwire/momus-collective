import pytest
from django.conf import settings
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User
from config.authentication import ACCESS_COOKIE, REFRESH_COOKIE, REFRESH_COOKIE_PATH
from designs.tests.test_saved_designs import CONFIG

pytestmark = pytest.mark.django_db

PASSWORD = "correct-horse-battery"


@pytest.fixture
def user():
    return User.objects.create_user(
        email="ada@example.com", password=PASSWORD, first_name="Ada", phone="1"
    )


def browser():
    """A client that enforces CSRF, as a real browser session must."""
    client = APIClient(enforce_csrf_checks=True)
    csrf = client.get("/api/v1/auth/session/").json()["csrf"]
    return client, csrf


def log_in(client, csrf, remember=True):
    return client.post(
        "/api/v1/auth/session/login/",
        {"email": "ada@example.com", "password": PASSWORD, "remember_me": remember},
        format="json",
        HTTP_X_CSRFTOKEN=csrf,
    )


def test_login_sets_httponly_cookies_and_returns_no_tokens(user):
    client, csrf = browser()
    resp = log_in(client, csrf)
    assert resp.status_code == 200
    body = resp.json()
    assert body["user"] == {"email": "ada@example.com", "first_name": "Ada"}
    assert "access" not in str(body) and "refresh" not in str(body)
    access, refresh = resp.cookies[ACCESS_COOKIE], resp.cookies[REFRESH_COOKIE]
    for cookie in (access, refresh):
        assert cookie["httponly"] is True
        assert cookie["secure"] is True
        assert cookie["samesite"] == "Lax"
    assert refresh["path"] == REFRESH_COOKIE_PATH
    assert access["path"] == "/"


def test_remember_me_sets_a_30_day_refresh_cookie_otherwise_a_browser_session(user):
    client, csrf = browser()
    remembered = log_in(client, csrf, remember=True).cookies[REFRESH_COOKIE]
    assert int(remembered["max-age"]) == 30 * 24 * 3600
    client, csrf = browser()
    session_only = log_in(client, csrf, remember=False).cookies[REFRESH_COOKIE]
    assert session_only["max-age"] == ""


def test_login_without_a_csrf_token_is_refused(user):
    client = APIClient(enforce_csrf_checks=True)
    client.get("/api/v1/auth/session/")
    resp = client.post(
        "/api/v1/auth/session/login/",
        {"email": "ada@example.com", "password": PASSWORD},
        format="json",
    )
    assert resp.status_code == 403
    assert ACCESS_COOKIE not in resp.cookies


def test_wrong_password_is_401_and_sets_nothing(user):
    client, csrf = browser()
    resp = client.post(
        "/api/v1/auth/session/login/",
        {"email": "ada@example.com", "password": "wrong-password"},
        format="json",
        HTTP_X_CSRFTOKEN=csrf,
    )
    assert resp.status_code == 401
    assert ACCESS_COOKIE not in resp.cookies


def test_the_cookie_authenticates_reads_without_any_header(user):
    client, csrf = browser()
    log_in(client, csrf)
    assert client.get("/api/v1/designs/").status_code == 200
    assert client.get("/api/v1/auth/session/").json()["user"]["email"] == (
        "ada@example.com"
    )


def test_cookie_authenticated_writes_need_the_csrf_token(user):
    client, csrf = browser()
    log_in(client, csrf)
    body = {"name": "x", "config": CONFIG}
    forged = client.post("/api/v1/designs/", body, format="json")
    assert forged.status_code == 403
    genuine = client.post(
        "/api/v1/designs/", body, format="json", HTTP_X_CSRFTOKEN=csrf
    )
    assert genuine.status_code == 201


def test_a_write_from_a_foreign_origin_is_refused_even_with_a_token(user):
    client, csrf = browser()
    log_in(client, csrf)
    body = {"name": "x", "config": CONFIG}
    evil = client.post(
        "/api/v1/designs/",
        body,
        format="json",
        HTTP_X_CSRFTOKEN=csrf,
        HTTP_ORIGIN="https://evil.example",
    )
    assert evil.status_code == 403
    ours = client.post(
        "/api/v1/designs/",
        body,
        format="json",
        HTTP_X_CSRFTOKEN=csrf,
        HTTP_ORIGIN=settings.FRONTEND_URL,
    )
    assert ours.status_code == 201


def test_a_stale_access_cookie_leaves_public_pages_working(user):
    client = APIClient()
    client.cookies[ACCESS_COOKIE] = "not-a-real-token"
    assert client.get("/api/v1/products/").status_code == 200
    assert client.get("/api/v1/designs/").status_code == 401


def test_refresh_rotates_and_the_old_refresh_token_is_spent(user):
    client, csrf = browser()
    old = log_in(client, csrf).cookies[REFRESH_COOKIE].value
    resp = client.post("/api/v1/auth/session/refresh/", HTTP_X_CSRFTOKEN=csrf)
    assert resp.status_code == 200
    new = resp.cookies[REFRESH_COOKIE].value
    assert new != old

    replay = APIClient(enforce_csrf_checks=True)
    replay.cookies[REFRESH_COOKIE] = old
    replay_csrf = replay.get("/api/v1/auth/session/").json()["csrf"]
    replayed = replay.post(
        "/api/v1/auth/session/refresh/", HTTP_X_CSRFTOKEN=replay_csrf
    )
    assert replayed.status_code == 401


def test_rotation_keeps_a_browser_session_a_browser_session(user):
    client, csrf = browser()
    log_in(client, csrf, remember=False)
    resp = client.post("/api/v1/auth/session/refresh/", HTTP_X_CSRFTOKEN=csrf)
    assert resp.cookies[REFRESH_COOKIE]["max-age"] == ""
    assert RefreshToken(resp.cookies[REFRESH_COOKIE].value)["remember"] is False


def test_refresh_needs_the_csrf_token(user):
    client, csrf = browser()
    log_in(client, csrf)
    assert client.post("/api/v1/auth/session/refresh/").status_code == 403


def test_session_renews_an_expired_access_cookie_from_the_refresh_cookie(user):
    client, csrf = browser()
    log_in(client, csrf)
    client.cookies[ACCESS_COOKIE] = "expired"
    resp = client.get("/api/v1/auth/session/")
    assert resp.json()["user"]["email"] == "ada@example.com"
    assert ACCESS_COOKIE in resp.cookies


def test_logout_clears_cookies_and_spends_the_refresh_token(user):
    client, csrf = browser()
    refresh = log_in(client, csrf).cookies[REFRESH_COOKIE].value
    resp = client.post("/api/v1/auth/session/logout/", HTTP_X_CSRFTOKEN=csrf)
    assert resp.status_code == 204
    assert resp.cookies[ACCESS_COOKIE].value == ""
    assert resp.cookies[REFRESH_COOKIE].value == ""
    assert client.get("/api/v1/auth/session/").json()["user"] is None
    revived = APIClient(enforce_csrf_checks=True)
    revived.cookies[REFRESH_COOKIE] = refresh
    assert revived.get("/api/v1/auth/session/").json()["user"] is None


def test_anonymous_session_reports_no_user_and_a_csrf_token():
    body = APIClient().get("/api/v1/auth/session/").json()
    assert body["user"] is None
    assert body["csrf"]


def test_bearer_header_clients_still_work_without_csrf(user):
    token = RefreshToken.for_user(user).access_token
    client = APIClient(enforce_csrf_checks=True)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    resp = client.post(
        "/api/v1/designs/", {"name": "x", "config": CONFIG}, format="json"
    )
    assert resp.status_code == 201


def test_session_login_is_rate_limited(user):
    client, csrf = browser()
    statuses = [
        client.post(
            "/api/v1/auth/session/login/",
            {"email": "ada@example.com", "password": "wrong"},
            format="json",
            HTTP_X_CSRFTOKEN=csrf,
        ).status_code
        for _ in range(11)
    ]
    assert statuses[-1] == 429


def test_cors_allows_credentials_for_the_frontend_only():
    ours = APIClient().get("/api/v1/auth/session/", HTTP_ORIGIN=settings.FRONTEND_URL)
    assert ours["Access-Control-Allow-Credentials"] == "true"
    assert ours["Access-Control-Allow-Origin"] == settings.FRONTEND_URL
    evil = APIClient().get("/api/v1/auth/session/", HTTP_ORIGIN="https://evil.example")
    assert "Access-Control-Allow-Origin" not in evil
