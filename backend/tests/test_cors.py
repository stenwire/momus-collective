import pytest
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db


def test_frontend_origin_is_allowed():
    resp = APIClient().get("/api/v1/health/", HTTP_ORIGIN="http://localhost:3000")
    assert resp["Access-Control-Allow-Origin"] == "http://localhost:3000"


def test_an_untrusted_origin_is_not_echoed_back():
    resp = APIClient().get("/api/v1/health/", HTTP_ORIGIN="https://evil.example.com")
    assert "Access-Control-Allow-Origin" not in resp
