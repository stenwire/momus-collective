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
        order.delivered_at = timezone.now() if status == OrderStatus.DELIVERED else None
        order.save(
            update_fields=["status", "status_history", "delivered_at", "updated_at"]
        )
        notify_status(order)
    return order, True


# Long enough to undo a mis-drag before the customer hears about it.
STATUS_GRACE_SECONDS = 60


def notify_status(order):
    """FR-NOT-02, after commit and a grace period."""
    from notifications.tasks import status_update

    if order.status == OrderStatus.PAID:
        return
    args = (str(order.id), len(order.status_history) - 1)
    transaction.on_commit(
        lambda: status_update.apply_async(args, countdown=STATUS_GRACE_SECONDS),
        robust=True,
    )
