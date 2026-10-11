from django.urls import path

from . import session_views, views
from .auth_views import LoginView, RefreshView, google_login

urlpatterns = [
    path("register/", views.register, name="auth-register"),
    path("verify-email/", views.verify_email, name="auth-verify-email"),
    path("login/", LoginView.as_view(), name="auth-login"),
    path("login/google/", google_login, name="auth-login-google"),
    path("token/refresh/", RefreshView.as_view(), name="auth-token-refresh"),
    path("session/", session_views.session, name="auth-session"),
    path("session/login/", session_views.session_login, name="auth-session-login"),
    path(
        "session/refresh/", session_views.session_refresh, name="auth-session-refresh"
    ),
    path("session/logout/", session_views.session_logout, name="auth-session-logout"),
    path(
        "password-reset/",
        views.request_password_reset,
        name="auth-password-reset-request",
    ),
    path(
        "password-reset/confirm/",
        views.confirm_password_reset,
        name="auth-password-reset-confirm",
    ),
]
