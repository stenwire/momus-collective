from celery import shared_task

from config.email import EmailNotSent

from .whatsapp import WhatsAppError


@shared_task(autoretry_for=(EmailNotSent,), retry_backoff=True, max_retries=5)
def design_outcome(order_id, outcome):
    from orders.models import Order

    from .customer import design_outcome as send

    order = Order.objects.select_related("user").get(pk=order_id)
    # A rejection superseded by a revision, or an approval undone, is stale.
    if outcome == "rejected" and not order.rejected_at:
        return
    send(order, outcome)


@shared_task(
    autoretry_for=(EmailNotSent, WhatsAppError), retry_backoff=True, max_retries=5
)
def status_update(order_id, entry_index):
    from orders.models import Order

    from .customer import status_update as send

    order = Order.objects.select_related("user").get(pk=order_id)
    # Changed again within the grace period: only the latest is news.
    if entry_index != len(order.status_history) - 1:
        return
    send(order, entry_index)
