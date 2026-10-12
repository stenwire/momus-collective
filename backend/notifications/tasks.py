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


@shared_task
def send_review_prompts():
    """Hourly (CELERY_BEAT_SCHEDULE): orders delivered at least 3 days ago
    that haven't been prompted. One failure doesn't stop the rest."""
    from datetime import timedelta

    from django.utils import timezone

    from orders.models import Order, OrderStatus

    from .customer import REVIEW_PROMPT_DELAY_DAYS, review_prompt

    due = (
        Order.objects.filter(
            status=OrderStatus.DELIVERED,
            delivered_at__lte=timezone.now() - timedelta(days=REVIEW_PROMPT_DELAY_DAYS),
        )
        .exclude(notifications__kind="review_prompt")
        .select_related("user")
        .prefetch_related("items__product")
    )
    sent = 0
    for order in due:
        try:
            sent += bool(review_prompt(order))
        except EmailNotSent:
            continue
    return sent
