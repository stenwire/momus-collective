from django.urls import include, path
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.routers import DefaultRouter

from accounts import account_views, admin_customers
from accounts.address_views import AddressViewSet
from catalog.admin_views import (
    AdminCategoryViewSet,
    AdminCollectionViewSet,
    AdminProductViewSet,
)
from designs.views import SavedDesignViewSet
from promocodes.admin_views import AdminPromoCodeViewSet

router = DefaultRouter()
router.register("addresses", AddressViewSet, basename="address")
router.register("designs", SavedDesignViewSet, basename="design")
router.register("admin/products", AdminProductViewSet, basename="admin-product")
router.register("admin/categories", AdminCategoryViewSet, basename="admin-category")
router.register(
    "admin/collections", AdminCollectionViewSet, basename="admin-collection"
)
router.register("admin/promo-codes", AdminPromoCodeViewSet, basename="admin-promo-code")


@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    """Proves /api/v1/ actually resolves to DRF, not just that the URLconf
    declares it. Real endpoints replace this as each app lands its routes."""
    return Response({"status": "ok"})


urlpatterns = [
    path("health/", health, name="api-health"),
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
    path(
        "admin/customers/", admin_customers.admin_customer_list, name="admin-customers"
    ),
    path(
        "admin/customers/<uuid:pk>/",
        admin_customers.admin_customer_detail,
        name="admin-customer-detail",
    ),
    path("", include("catalog.urls")),
    path("", include("designs.urls")),
    path("", include("carts.urls")),
    path("", include("orders.urls")),
    path("", include("newsletter.urls")),
    path("", include("reviews.urls")),
    path("", include(router.urls)),
]
