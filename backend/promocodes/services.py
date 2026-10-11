"""FR-CART-07: every rule is checked when the code is applied and again,
under a row lock, when the order is created (SEC-07)."""

from django.db.models import Q
from django.utils import timezone

from .models import DiscountType, PromoCode, PromoRedemption


class PromoError(Exception):
    pass


def _uses_by(promo, user, email):
    who = Q(email__iexact=email) if email else Q(pk__in=[])
    if user is not None:
        who |= Q(user=user)
    return PromoRedemption.objects.filter(who, promo_code=promo).count()


def discount_for(promo, subtotal):
    if promo.discount_type == DiscountType.PERCENTAGE:
        return subtotal * min(promo.discount_value, 100) // 100
    return min(promo.discount_value, subtotal)


def check(promo, subtotal, user, email, now=None):
    now = now or timezone.now()
    if not promo.is_active:
        raise PromoError("This code isn't active.")
    if promo.expires_at and promo.expires_at <= now:
        raise PromoError("This code has expired.")
    if promo.max_uses is not None and promo.uses_count >= promo.max_uses:
        raise PromoError("This code has been fully used.")
    if _uses_by(promo, user, email) >= promo.max_uses_per_user:
        raise PromoError("You've already used this code.")
    if promo.min_order_value is not None and subtotal < promo.min_order_value:
        raise PromoError("Your order is under this code's minimum.")
    return discount_for(promo, subtotal)


def find(code):
    promo = PromoCode.objects.filter(code__iexact=code.strip()).first()
    if promo is None:
        raise PromoError("We don't recognise that code.")
    return promo


def redeem(code, order, subtotal, user, email):
    """Called inside the order's transaction: lock the code, re-check every
    rule against the real numbers, then count the use."""
    promo = PromoCode.objects.select_for_update().get(pk=find(code).pk)
    discount = check(promo, subtotal, user, email)
    promo.uses_count += 1
    promo.save(update_fields=["uses_count"])
    PromoRedemption.objects.create(
        promo_code=promo, order=order, user=user, email=email, discount=discount
    )
    return promo, discount
