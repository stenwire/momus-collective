import uuid

import pytest
from django.db import IntegrityError, transaction

from promocodes.models import DiscountType, PromoCode

pytestmark = pytest.mark.django_db


def make_promo(**kwargs):
    kwargs.setdefault("code", "WELCOME10")
    kwargs.setdefault("discount_type", DiscountType.PERCENTAGE)
    kwargs.setdefault("discount_value", 10)
    return PromoCode.objects.create(**kwargs)


def test_promo_code_pk_is_a_uuid():
    assert isinstance(make_promo().id, uuid.UUID)


def test_code_is_unique():
    make_promo(code="WELCOME10")
    with pytest.raises(IntegrityError), transaction.atomic():
        make_promo(code="WELCOME10")


def test_discount_value_is_an_integer_not_a_float():
    promo = make_promo(discount_value=15)
    field = PromoCode._meta.get_field("discount_value")
    assert field.get_internal_type() == "PositiveIntegerField"
    assert isinstance(promo.discount_value, int)


def test_uses_count_defaults_to_zero():
    assert make_promo().uses_count == 0


def test_max_uses_and_expiry_are_nullable_for_unlimited_codes():
    promo = make_promo(max_uses=None, expires_at=None)
    assert promo.max_uses is None
    assert promo.expires_at is None


def test_flat_discount_type_is_valid():
    promo = make_promo(
        code="FLAT500", discount_type=DiscountType.FLAT, discount_value=50000
    )
    assert promo.discount_type == "flat"
