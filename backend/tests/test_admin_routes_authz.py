"""NFR-04 / DoD 17: every route under /api/v1/admin/ declares IsStaffUser
itself and refuses anonymous (401) and customer (403) requests on every
method. The routes are discovered, so a new admin route is checked too."""

import re

import pytest
from django.urls import URLPattern, URLResolver, get_resolver
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User
from config.permissions import IsStaffUser

pytestmark = pytest.mark.django_db
PLACEHOLDER = "00000000-0000-0000-0000-000000000000"
METHODS = ["get", "post", "put", "patch", "delete"]
# Staff-only routes that live outside /api/v1/admin/.
STAFF_ROUTES = ("/api/v1/orders/items/",)


def _walk(patterns, prefix=""):
    for p in patterns:
        route = prefix + str(p.pattern)
        if isinstance(p, URLResolver):
            yield from _walk(p.url_patterns, route)
        elif isinstance(p, URLPattern):
            yield route, p.callback


def _concrete(route):
    """A requestable path for a route: regex groups and converters become a
    placeholder id. Format-suffix variants (`.json`) are skipped."""
    if "(?P<format>" in route:
        return None
    route = re.sub(r"\(\?P<\w+>[^)]*\)", PLACEHOLDER, route)
    route = re.sub(r"<(?:\w+:)?\w+>", PLACEHOLDER, route)
    return "/" + route.replace("^", "").replace("$", "")


def admin_routes():
    seen = {}
    for route, view in _walk(get_resolver().url_patterns):
        path = _concrete(route)
        if path and path.startswith(("/api/v1/admin/", *STAFF_ROUTES)):
            seen.setdefault(path, view)
    return sorted(seen.items())


def _permission_classes(view):
    cls = getattr(view, "cls", None) or getattr(view, "view_class", None)
    if cls is not None:
        return list(getattr(cls, "permission_classes", []))
    return list(getattr(view, "permission_classes", []))


def customer_client():
    user = User.objects.create_user(email="c@example.com", password="x" * 12, phone="1")
    client = APIClient()
    client.credentials(
        HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(user).access_token}"
    )
    return client


def test_the_admin_routes_are_found():
    paths = [p for p, _ in admin_routes()]
    for expected in (
        "/api/v1/admin/orders/board/",
        "/api/v1/admin/moderation/",
        "/api/v1/admin/analytics/",
        "/api/v1/admin/promo-codes/",
        "/api/v1/admin/customers/",
        "/api/v1/admin/reviews/",
        "/api/v1/admin/products/",
        "/api/v1/admin/delivery-settings/",
        "/api/v1/admin/design-pricing/",
        f"/api/v1/orders/items/{PLACEHOLDER}/design-file/",
    ):
        assert expected in paths
    assert len(paths) >= 25


@pytest.mark.parametrize(
    "path,view", admin_routes(), ids=[p for p, _ in admin_routes()]
)
def test_admin_route_authz_declares_is_staff(path, view):
    assert IsStaffUser in _permission_classes(view), path


@pytest.mark.parametrize("path", [p for p, _ in admin_routes()])
def test_admin_route_authz_refuses_anonymous_and_customers(path):
    anonymous, customer = APIClient(), customer_client()
    for method in METHODS:
        assert getattr(anonymous, method)(path).status_code == 401, (method, path)
        assert getattr(customer, method)(path).status_code == 403, (method, path)
