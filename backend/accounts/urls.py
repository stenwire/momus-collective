from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views
from .auth_views import LoginView, google_login

urlpatterns = [
    path("register/", views.register, name="auth-register"),
    path("verify-email/", views.verify_email, name="auth-verify-email"),
    path("login/", LoginView.as_view(), name="auth-login"),
    path("login/google/", google_login, name="auth-login-google"),
    path("token/refresh/", TokenRefreshView.as_view(), name="auth-token-refresh"),
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
