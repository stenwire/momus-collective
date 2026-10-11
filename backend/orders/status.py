"""FR-ADM-02: every status change goes through here, so the history is
always written and the customer always hears about it (T-507)."""

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from .models import Order, OrderStatus

# The admin board's columns, in order (DoD 2). Moderation has its own queue
# (T-505); refunded is reached by cancelling and refunding, not dragging.
BOARD = [
    OrderStatus.PAID,
    OrderStatus.SHIRT_ACQUIRED,
    OrderStatus.PRINTED,
    OrderStatus.OUT_FOR_DELIVERY,
    OrderStatus.DELIVERED,
    OrderStatus.CANCELLED,
]


def change_status(order_id, status, by, note=""):
    if status not in BOARD:
        raise ValidationError({"status": "Choose one of the board's columns."})
    with transaction.atomic():
        order = Order.objects.select_for_update().get(pk=order_id)
        if order.status == OrderStatus.MODERATION:
            raise ValidationError(
                {"status": "This design is awaiting moderation; review it first."}
            )
        if order.status == status:
            return order, False
        entry = {"status": status, "timestamp": timezone.now().isoformat(), "by": by}
        if note:
            entry["note"] = note
        order.status = status
        order.status_history = [*order.status_history, entry]
        order.save(update_fields=["status", "status_history", "updated_at"])
    return order, True


def approve_design(order_id, by):
    """FR-ADM-07: an approved design proceeds to Shirt Acquired."""
    with transaction.atomic():
        order = Order.objects.select_for_update().get(pk=order_id)
        if order.status != OrderStatus.MODERATION:
            raise ValidationError({"status": "This order isn't awaiting moderation."})
        order.status = OrderStatus.SHIRT_ACQUIRED
        order.status_history = [
            *order.status_history,
            {
                "status": order.status,
                "timestamp": timezone.now().isoformat(),
                "by": by,
                "note": "Design approved",
            },
        ]
        order.save(update_fields=["status", "status_history", "updated_at"])
    return order
