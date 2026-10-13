import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient

from accounts.models import User
from catalog.models import Category, Product
from orders.tests.test_fulfilment import client_for
from promocodes.models import PromoCode, PromoRedemption
from promocodes.tests.test_redemption import order, promo, quote

pytestmark = pytest.mark.django_db
URL = "/api/v1/admin/promo-codes/"


@pytest.fixture
def staff():
    return client_for(
        User.objects.create_user(
            email="owner@example.com", password="x" * 12, phone="1", is_staff=True
        )
    )


@pytest.fixture
def shirt():
    category = Category.objects.create(name="Test Category", slug="test-category")
    return Product.objects.create(
        slogan="s", slug="s", category=category, price=1000000
    )


def redeem(code, n, discount):
    PromoRedemption.objects.create(
        promo_code=code, order=order(n), email=f"g{n}@example.com", discount=discount
    )
    code.uses_count += 1
    code.save()


def test_admin_promo_codes_authz():
    customer = client_for(
        User.objects.create_user(email="c@example.com", password="x" * 12, phone="1")
    )
    code = promo()
    for client, status in ((APIClient(), 401), (customer, 403)):
        assert client.get(URL).status_code == status
        assert (
            client.post(
                URL, {"code": "X", "discount_type": "flat", "discount_value": 1}
            ).status_code
            == status
        )
        assert (
            client.patch(f"{URL}{code.id}/", {"is_active": False}).status_code == status
        )
        assert client.delete(f"{URL}{code.id}/").status_code == status
    code.refresh_from_db()
    assert code.is_active


def test_creating_a_code_normalises_and_checks_it(staff):
    resp = staff.post(
        URL,
        {
            "code": " naps-20 ",
            "discount_type": "percentage",
            "discount_value": 20,
            "max_uses": 100,
            "max_uses_per_user": 1,
            "min_order_value": 1000000,
            "expires_at": "2026-12-31T23:59:00+01:00",
        },
        format="json",
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["code"] == "NAPS-20"
    assert (body["redemptions"], body["total_discount"], body["remaining_uses"]) == (
        0,
        0,
        100,
    )
    assert PromoCode.objects.get(code="NAPS-20").min_order_value == 1000000


@pytest.mark.parametrize(
    "body,field",
    [
        ({"code": "NAPS20", "discount_type": "flat", "discount_value": 1}, "code"),
        ({"code": "bad code!", "discount_type": "flat", "discount_value": 1}, "code"),
        (
            {"code": "BIG", "discount_type": "percentage", "discount_value": 101},
            "discount_value",
        ),
        (
            {"code": "ZERO", "discount_type": "flat", "discount_value": 0},
            "discount_value",
        ),
        (
            {
                "code": "MAX0",
                "discount_type": "flat",
                "discount_value": 1,
                "max_uses": 0,
            },
            "max_uses",
        ),
        (
            {
                "code": "PER0",
                "discount_type": "flat",
                "discount_value": 1,
                "max_uses_per_user": 0,
            },
            "max_uses_per_user",
        ),
        (
            {"code": "KIND", "discount_type": "free", "discount_value": 1},
            "discount_type",
        ),
    ],
)
def test_invalid_codes_are_refused(staff, body, field):
    promo(code="naps20")
    resp = staff.post(URL, body, format="json")
    assert resp.status_code == 400 and field in resp.json()


def test_each_code_tracks_redemptions_discount_and_remaining_uses(staff):
    limited = promo(code="LIMITED", max_uses=3)
    unlimited = promo(code="OPEN", max_uses=None)
    redeem(limited, 1, 200000)
    redeem(limited, 2, 150000)
    rows = {r["code"]: r for r in staff.get(URL).json()}
    assert (rows["LIMITED"]["redemptions"], rows["LIMITED"]["total_discount"]) == (
        2,
        350000,
    )
    assert rows["LIMITED"]["remaining_uses"] == 1
    assert (rows["OPEN"]["redemptions"], rows["OPEN"]["remaining_uses"]) == (0, None)
    unlimited.refresh_from_db()


def test_an_overused_code_shows_zero_remaining_not_negative(staff):
    code = promo(code="OVER", max_uses=1)
    redeem(code, 1, 1)
    redeem(code, 2, 1)
    [row] = staff.get(URL).json()
    assert row["remaining_uses"] == 0


def test_editing_and_deactivating_take_effect_at_checkout(staff, shirt):
    code = promo(code="NAPS20")
    resp = staff.patch(f"{URL}{code.id}/", {"discount_value": 50}, format="json")
    assert resp.status_code == 200 and resp.json()["discount_value"] == 50
    assert quote(shirt, "NAPS20")["discount"] == 500000
    staff.patch(f"{URL}{code.id}/", {"is_active": False}, format="json")
    assert quote(shirt, "NAPS20")["promo_error"] == "This code isn't active."


def test_editing_keeps_the_code_unique(staff):
    promo(code="FIRST")
    second = promo(code="SECOND")
    resp = staff.patch(f"{URL}{second.id}/", {"code": "first"}, format="json")
    assert resp.status_code == 400
    assert (
        staff.patch(f"{URL}{second.id}/", {"code": "second"}, format="json").status_code
        == 200
    )


def test_unused_codes_can_be_deleted_but_used_ones_are_kept(staff):
    unused = promo(code="UNUSED")
    used = promo(code="USED")
    redeem(used, 1, 100)
    assert staff.delete(f"{URL}{unused.id}/").status_code == 204
    resp = staff.delete(f"{URL}{used.id}/")
    assert resp.status_code == 409
    assert "Deactivate it instead" in resp.json()["detail"]
    assert PromoRedemption.objects.filter(promo_code=used).count() == 1


def test_admin_promo_codes_num_queries_are_constant(staff):
    code = promo(code="ONE")
    redeem(code, 1, 1)
    with CaptureQueriesContext(connection) as few:
        staff.get(URL)
    for n in range(2, 10):
        other = promo(code=f"C{n}")
        redeem(other, n, 1)
    with CaptureQueriesContext(connection) as many:
        assert len(staff.get(URL).json()) == 9
    assert len(few) == len(many)
