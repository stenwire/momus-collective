import re
import uuid
from datetime import UTC, datetime

import pytest
from django.db import IntegrityError, transaction

from accounts.models import User
from orders.models import Order, OrderStatus
from orders.numbering import generate_order_number

pytestmark = pytest.mark.django_db

ORDER_NUMBER_RE = re.compile(r"^MOM-\d{8}-\d{3}$")


def make_user(email="buyer@example.com"):
    return User.objects.create_user(
        email=email,
        password="a-strong-password",
        first_name="Ada",
        phone="+2348000000000",
    )


def make_order(**kwargs):
    kwargs.setdefault("order_number", generate_order_number())
    kwargs.setdefault("shipping_address", {"city": "Lagos", "line_1": "1 Marina Rd"})
    kwargs.setdefault("subtotal", 500000)
    kwargs.setdefault("total", 500000)
    return Order.objects.create(**kwargs)


def test_order_pk_is_a_uuid():
    assert isinstance(make_order(user=make_user()).id, uuid.UUID)


def test_order_number_matches_mom_yyyymmdd_nnn():
    order = make_order(user=make_user())
    assert ORDER_NUMBER_RE.match(order.order_number)


def test_order_number_sequence_increments_within_a_day():
    fixed = datetime(2026, 9, 26, tzinfo=UTC)
    first = generate_order_number(now=fixed)
    make_order(user=make_user("a@example.com"), order_number=first)
    second = generate_order_number(now=fixed)
    assert first == "MOM-20260926-001"
    assert second == "MOM-20260926-002"


def test_tracking_token_is_not_the_order_number():
    """SEC-13: the guest tracking credential must not be the enumerable
    sequential order number."""
    order = make_order(user=make_user())
    assert order.tracking_token != order.order_number
    assert len(order.tracking_token) >= 32


def test_two_orders_get_different_tracking_tokens():
    o1 = make_order(user=make_user("a@example.com"))
    o2 = make_order(user=make_user("b@example.com"))
    assert o1.tracking_token != o2.tracking_token


def test_order_number_is_unique():
    make_order(user=make_user(), order_number="MOM-20260926-001")
    with pytest.raises(IntegrityError), transaction.atomic():
        make_order(user=make_user("b@example.com"), order_number="MOM-20260926-001")


def test_guest_order_has_email_and_phone_no_user():
    order = make_order(guest_email="guest@example.com", guest_phone="+2348011112222")
    assert order.user is None
    assert order.guest_email == "guest@example.com"


def test_order_must_have_a_user_or_full_guest_contact():
    with pytest.raises(IntegrityError), transaction.atomic():
        make_order()


def test_shipping_address_is_a_json_snapshot_not_an_fk():
    """The order's address must not follow a later edit to the user's
    saved Address row -- it is a point-in-time copy."""
    order = make_order(
        user=make_user(), shipping_address={"city": "Lagos", "line_1": "1 Marina Rd"}
    )
    snapshot = dict(order.shipping_address)
    order.shipping_address["city"] = "Abuja"
    order.save()
    order.refresh_from_db()
    assert order.shipping_address["city"] == "Abuja"
    assert snapshot["city"] == "Lagos"
    assert not hasattr(Order, "address")


def test_status_defaults_to_paid():
    assert make_order(user=make_user()).status == OrderStatus.PAID


def test_status_choices_are_the_eight_named_values():
    values = {c.value for c in OrderStatus}
    assert values == {
        "paid",
        "moderation",
        "shirt_acquired",
        "printed",
        "out_for_delivery",
        "delivered",
        "cancelled",
        "refunded",
    }


def test_money_fields_are_integers_not_floats():
    order = make_order(
        user=make_user(), subtotal=750000, total=800000, delivery_fee=50000
    )
    assert isinstance(order.subtotal, int)
    assert isinstance(order.total, int)
    assert isinstance(order.delivery_fee, int)


def test_order_can_reference_a_promo_code():
    from promocodes.models import DiscountType, PromoCode

    promo = PromoCode.objects.create(
        code="WELCOME10", discount_type=DiscountType.PERCENTAGE, discount_value=10
    )
    order = make_order(user=make_user(), promo_code=promo)
    assert order.promo_code == promo


def test_order_survives_promo_code_deletion():
    from promocodes.models import DiscountType, PromoCode

    promo = PromoCode.objects.create(
        code="WELCOME10", discount_type=DiscountType.PERCENTAGE, discount_value=10
    )
    order = make_order(user=make_user(), promo_code=promo)
    promo.delete()
    order.refresh_from_db()
    assert order.promo_code is None
