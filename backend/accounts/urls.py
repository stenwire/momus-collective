from django.urls import path

from . import views

urlpatterns = [
    path("register/", views.register, name="auth-register"),
    path("verify-email/", views.verify_email, name="auth-verify-email"),
]
