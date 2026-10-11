"""FR-CART-07: every rule is checked when the code is applied and again,
under a row lock, when the checkout opens (SEC-07)."""

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


def check(promo, subtotal, user, email, now=None, held=0, held_by_customer=0):
    """`held` counts checkouts still awaiting payment with this code, all of
    them and this customer's (see `reserve`)."""
    now = now or timezone.now()
    if not promo.is_active:
        raise PromoError("This code isn't active.")
    if promo.expires_at and promo.expires_at <= now:
        raise PromoError("This code has expired.")
    if promo.max_uses is not None and promo.uses_count >= promo.max_uses:
        raise PromoError("This code has been fully used.")
    if promo.max_uses is not None and promo.uses_count + held >= promo.max_uses:
        raise PromoError(
            "This code's last uses are held by checkouts in progress. "
            "Try again in a few minutes."
        )
    used = _uses_by(promo, user, email)
    if used >= promo.max_uses_per_user:
        raise PromoError("You've already used this code.")
    if used + held_by_customer >= promo.max_uses_per_user:
        raise PromoError(
            "You have an unfinished checkout using this code. "
            "Finish it, or try again in 30 minutes."
        )
    if promo.min_order_value is not None and subtotal < promo.min_order_value:
        raise PromoError("Your order is under this code's minimum.")
    return discount_for(promo, subtotal)


def find(code):
    promo = PromoCode.objects.filter(code__iexact=code.strip()).first()
    if promo is None:
        raise PromoError("We don't recognise that code.")
    return promo


def reserve(code, subtotal, user, email, holds):
    """SEC-07, when a checkout opens: lock the code and re-check every rule
    with unpaid checkouts counted as uses, so concurrent checkouts can't
    overrun a limit. `holds(promo)` gives (all held, this customer's)."""
    promo = PromoCode.objects.select_for_update().get(pk=find(code).pk)
    held, mine = holds(promo)
    return check(promo, subtotal, user, email, held=held, held_by_customer=mine)


def record_use(code, order, user, email, discount):
    """At order creation the customer has already paid the discounted total,
    so the use is recorded whatever the limits say now; the gate was the
    locked check before payment. Returns True if the code went over a limit,
    for the admin to see."""
    promo = PromoCode.objects.select_for_update().filter(code__iexact=code).first()
    if promo is None:
        return True
    over = (promo.max_uses is not None and promo.uses_count >= promo.max_uses) or (
        _uses_by(promo, user, email) >= promo.max_uses_per_user
    )
    promo.uses_count += 1
    promo.save(update_fields=["uses_count"])
    PromoRedemption.objects.create(
        promo_code=promo, order=order, user=user, email=email, discount=discount
    )
    return over
