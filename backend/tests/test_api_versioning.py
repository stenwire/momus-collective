import pytest
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db


def test_api_v1_health_resolves_and_responds():
    """API-01: DRF routes live under /api/v1/ -- proved by an anonymous
    request actually reaching a view, not just a URLconf declaration."""
    resp = APIClient().get("/api/v1/health/")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_unversioned_api_path_does_not_resolve():
    resp = APIClient().get("/api/health/")
    assert resp.status_code == 404


def test_default_permission_is_authenticated_not_open():
    """A future endpoint that forgets to set permissions is denied, not
    silently public. health/ overrides this explicitly with AllowAny."""
    from django.conf import settings

    assert settings.REST_FRAMEWORK["DEFAULT_PERMISSION_CLASSES"] == [
        "rest_framework.permissions.IsAuthenticated"
    ]
