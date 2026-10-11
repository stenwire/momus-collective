from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from catalog.models import Category, Product
from orders.models import Order
from promocodes.models import PromoCode, PromoRedemption

pytestmark = pytest.mark.django_db
QUOTE = "/api/v1/checkout/quote/"


@pytest.fixture
def product():
    category = Category.objects.create(name="Test Category", slug="test-category")
    return Product.objects.create(
        slogan="touch grass", slug="tg", category=category, price=1000000
    )


def promo(**overrides):
    fields = {
        "code": "NAPS20",
        "discount_type": "percentage",
        "discount_value": 20,
        "max_uses_per_user": 1,
        **overrides,
    }
    return PromoCode.objects.create(**fields)


def quote(product, code, quantity=1, email="guest@example.com"):
    body = {
        "items": [
            {"product": str(product.id), "size": "M", "color": "", "quantity": quantity}
        ],
        "promo_code": code,
        "email": email,
    }
    return APIClient().post(QUOTE, body, format="json").json()


def order(n=1):
    return Order.objects.create(
        order_number=f"MOM-20261011-{n:03d}",
        guest_email="guest@example.com",
        guest_phone="1",
        shipping_address={},
        subtotal=1000000,
        total=1000000,
    )


def test_a_percentage_code_discounts_the_subtotal(product):
    promo()
    body = quote(product, "naps20", quantity=2)
    assert body["discount"] == 400000
    assert body["promo_code"] == "NAPS20"
    assert body["total"] == 2000000 - 400000


def test_a_flat_code_never_takes_the_order_below_zero(product):
    promo(code="BIG", discount_type="flat", discount_value=5000000)
    body = quote(product, "BIG")
    assert body["discount"] == 1000000
    assert body["total"] == 0


@pytest.mark.parametrize(
    "overrides,message",
    [
        ({"is_active": False}, "isn't active"),
        ({"expires_at": timezone.now() - timedelta(minutes=1)}, "expired"),
        ({"max_uses": 2, "uses_count": 2}, "fully used"),
        ({"min_order_value": 1500000}, "minimum"),
    ],
)
def test_each_rule_is_enforced_with_a_clear_reason(product, overrides, message):
    promo(**overrides)
    body = quote(product, "NAPS20")
    assert body["discount"] == 0
    assert message in body["promo_error"]
    assert body["total"] == 1000000


def test_an_unknown_code_is_explained_and_the_quote_still_stands(product):
    body = quote(product, "NOPE")
    assert body["promo_error"] == "We don't recognise that code."
    assert body["total"] == 1000000


def test_the_minimum_is_met_by_the_subtotal(product):
    promo(min_order_value=2000000)
    assert quote(product, "NAPS20", quantity=2)["discount"] == 400000


def test_per_customer_limit_counts_guest_uses_by_email(product):
    code = promo(max_uses_per_user=1)
    PromoRedemption.objects.create(
        promo_code=code, order=order(), email="Guest@Example.com", discount=1
    )
    assert "already used" in quote(product, "NAPS20")["promo_error"]
    assert quote(product, "NAPS20", email="someone@else.com")["discount"] == 200000


def test_a_percentage_above_100_cannot_exceed_the_subtotal(product):
    promo(discount_value=250)
    assert quote(product, "NAPS20")["discount"] == 1000000
