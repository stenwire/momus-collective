"""FR-ADM-07 and FR-NOT-03: a custom design is approved, or rejected with a
reason and the customer chooses to revise it or take a refund."""

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from designs.serializers import validate_design_config
from designs.storage import (
    design_storage,
    order_item_file_name,
    order_item_preview_name,
)

from .models import CustomerChoice, Order, OrderStatus, RejectionReason


def _locked(order_id):
    return Order.objects.select_for_update().get(pk=order_id)


def _log(order, status, by, note):
    entry = {"status": status, "timestamp": timezone.now().isoformat(), "note": note}
    if by:
        entry["by"] = by
    order.status_history = [*order.status_history, entry]


def _notify(order, outcome):
    from notifications.tasks import design_outcome

    order_id = str(order.id)
    transaction.on_commit(lambda: design_outcome.delay(order_id, outcome), robust=True)


def _awaiting_review(order):
    if order.status != OrderStatus.MODERATION or order.rejected_at:
        raise ValidationError({"status": "This order isn't awaiting review."})


def _awaiting_customer(order):
    if order.status != OrderStatus.MODERATION or not order.rejected_at:
        raise ValidationError({"status": "This design hasn't been rejected."})


def approve_design(order_id, by):
    with transaction.atomic():
        order = _locked(order_id)
        _awaiting_review(order)
        order.status = OrderStatus.SHIRT_ACQUIRED
        _log(order, order.status, by, "Design approved")
        order.save(update_fields=["status", "status_history", "updated_at"])
        _notify(order, "approved")
    return order


def reject_design(order_id, by, reason, details):
    if reason not in RejectionReason.values:
        raise ValidationError({"reason": "Choose one of the rejection reasons."})
    with transaction.atomic():
        order = _locked(order_id)
        _awaiting_review(order)
        order.rejection_reason = reason
        order.rejection_details = details
        order.rejected_at = timezone.now()
        order.customer_choice = CustomerChoice.NONE
        _log(
            order, order.status, by, f"Design rejected: {RejectionReason(reason).label}"
        )
        order.save()
        _notify(order, "rejected")
    return order


def request_refund(order_id):
    with transaction.atomic():
        order = _locked(order_id)
        _awaiting_customer(order)
        if order.customer_choice != CustomerChoice.REFUND:
            order.customer_choice = CustomerChoice.REFUND
            _log(order, order.status, None, "Customer asked for a refund")
            order.save(
                update_fields=["customer_choice", "status_history", "updated_at"]
            )
    return order


def revise_design(order_id, item_id, config):
    """The customer's new design replaces the rejected one, on the same
    shirt colour (the price was set by it), and goes back for review."""
    from designs.tasks import render_order_item_file

    with transaction.atomic():
        order = _locked(order_id)
        _awaiting_customer(order)
        if order.customer_choice == CustomerChoice.REFUND:
            raise ValidationError({"status": "A refund was requested for this order."})
        item = order.items.filter(pk=item_id, design_config__isnull=False).first()
        if item is None:
            raise ValidationError({"item": "That isn't a custom design on this order."})
        config = validate_design_config(config)
        if config["shirt_color"] != item.design_config["shirt_color"]:
            raise ValidationError(
                {"shirt_color": "The shirt colour can't change; it set the price."}
            )
        item.design_config = config
        item.slogan_text = config["text"]
        item.save(update_fields=["design_config", "slogan_text"])
        storage = design_storage()
        for name in (order_item_file_name(item.id), order_item_preview_name(item.id)):
            storage.delete(name)
        order.rejection_reason = ""
        order.rejection_details = ""
        order.rejected_at = None
        _log(order, order.status, None, "Design revised by the customer")
        order.save()
        item_id, frozen = str(item.id), config
        transaction.on_commit(
            lambda: render_order_item_file.delay(item_id, frozen), robust=True
        )
    return order


def mark_refunded(order_id, by):
    """The admin refunds in the Paystack dashboard, then records it here."""
    with transaction.atomic():
        order = _locked(order_id)
        _awaiting_customer(order)
        order.status = OrderStatus.REFUNDED
        _log(order, order.status, by, "Refunded after design rejection")
        order.save(update_fields=["status", "status_history", "updated_at"])
    return order
