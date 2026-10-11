from celery import shared_task

from config.email import EmailNotSent


@shared_task(autoretry_for=(EmailNotSent,), retry_backoff=True, max_retries=5)
def design_outcome(order_id, outcome):
    from orders.models import Order

    from .customer import design_outcome as send

    order = Order.objects.select_related("user").get(pk=order_id)
    # A rejection superseded by a revision, or an approval undone, is stale.
    if outcome == "rejected" and not order.rejected_at:
        return
    send(order, outcome)
