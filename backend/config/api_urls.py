from django.urls import include, path
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.routers import DefaultRouter

from accounts import account_views
from accounts.address_views import AddressViewSet

from .permissions import IsStaffUser

router = DefaultRouter()
router.register("addresses", AddressViewSet, basename="address")


@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    """Proves /api/v1/ actually resolves to DRF, not just that the URLconf
    declares it. Real endpoints replace this as each app lands its routes."""
    return Response({"status": "ok"})


@api_view(["GET"])
@permission_classes([IsStaffUser])
def admin_ping(request):
    """Real anchor for IsStaffUser (NFR-04) until M2's admin CRUD routes
    land and take over as the permission class's actual callers."""
    return Response({"status": "ok"})


urlpatterns = [
    path("health/", health, name="api-health"),
    path("admin/ping/", admin_ping, name="api-admin-ping"),
    path("auth/", include("accounts.urls")),
    path("account/", account_views.account_settings, name="account-settings"),
    path(
        "account/email/",
        account_views.request_email_change,
        name="account-email-change-request",
    ),
    path(
        "account/email/confirm/",
        account_views.confirm_email_change,
        name="account-email-change-confirm",
    ),
    path("account/password/", account_views.change_password, name="account-password"),
    path("", include("catalog.urls")),
    path("", include(router.urls)),
]
