"""FR-REV-01/02: only a customer whose order containing the product has been
delivered may review it, once; the badge comes from that order."""

from decimal import ROUND_HALF_UP, Decimal

from django.db import IntegrityError, transaction
from django.db.models import Avg
from rest_framework.exceptions import ValidationError

from orders.models import Order, OrderStatus

from .models import Review


def reviewer_name(review):
    """First name and last initial, as FR-REV-01 asks."""
    if review.user:
        first, last = review.user.first_name, review.user.last_name
    else:
        parts = review.order.shipping_address.get("full_name", "").split()
        first, last = (parts[0] if parts else "Customer"), " ".join(parts[1:])
    return f"{first} {last[0]}." if last else first


def _delivered_orders(product, user=None, token=None):
    orders = Order.objects.filter(
        status=OrderStatus.DELIVERED, items__product=product
    ).distinct()
    if token:
        return orders.filter(tracking_token=token)
    if user is not None and user.is_authenticated:
        return orders.filter(user=user)
    return orders.none()


def eligible_order(product, user=None, token=None):
    """The order to attach a review to, or a reason there isn't one."""
    orders = _delivered_orders(product, user, token)
    if not orders.exists():
        return None, "Reviews open once your order with this shirt is delivered."
    reviewed = Review.objects.filter(product=product)
    if token:
        if reviewed.filter(order__in=orders).exists():
            return None, "You've already reviewed this shirt."
    elif reviewed.filter(user=user).exists():
        return None, "You've already reviewed this shirt."
    return orders.order_by("-created_at").first(), ""


def refresh_rating(product):
    average = product.reviews.filter(is_visible=True).aggregate(a=Avg("rating"))["a"]
    product.avg_rating = Decimal(average or 0).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )
    product.save(update_fields=["avg_rating"])


def leave_review(product, rating, text, user=None, token=None):
    with transaction.atomic():
        order, reason = eligible_order(product, user, token)
        if order is None:
            raise ValidationError({"detail": reason})
        try:
            review = Review.objects.create(
                product=product,
                order=order,
                user=order.user if order.user_id else None,
                rating=rating,
                text=text.strip(),
                is_verified=True,
            )
        except IntegrityError as error:
            raise ValidationError(
                {"detail": "You've already reviewed this shirt."}
            ) from error
        refresh_rating(product)
    return review
