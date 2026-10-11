from datetime import date

from celery import shared_task
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils import timezone

from config.email import EmailNotSent

from .delivery import delivery_settings, estimated_delivery


def _image_url(order, item):
    if item.design_config:
        return (
            f"{settings.BACKEND_URL}/api/v1/orders/track/{order.tracking_token}"
            f"/items/{item.id}/preview/"
        )
    images = item.product.mockup_images if item.product else []
    if not images:
        return None
    return (
        images[0] if images[0].startswith("http") else settings.BACKEND_URL + images[0]
    )


def naira(kobo):
    naira, rest = divmod(kobo, 100)
    return f"₦{naira:,}" + (f".{rest:02d}" if rest else "")


def _window(order):
    window = estimated_delivery(order, delivery_settings())
    earliest, latest = (
        f"{d:%a} {d.day} {d:%b}"
        for d in (date.fromisoformat(window[k]) for k in ("earliest", "latest"))
    )
    return earliest if earliest == latest else f"{earliest} – {latest}"


def send_order_confirmation(order):
    """FR-NOT-01. Marked sent only after the provider accepts it, so a
    retry after a failure sends it and a retry after success does not."""
    recipient = order.user.email if order.user else order.guest_email
    context = {
        "order": order,
        "items": [
            {
                "item": item,
                "image": _image_url(order, item),
                "title": "Custom Design" if item.design_config else item.slogan_text,
                "line_total": naira(item.unit_price * item.quantity),
            }
            for item in order.items.all()
        ],
        "subtotal": naira(order.subtotal),
        "delivery": naira(order.delivery_fee) if order.delivery_fee else "Free",
        "discount": naira(order.discount) if order.discount else "",
        "total": naira(order.total),
        "address": order.shipping_address,
        "window": _window(order),
        "tracking_url": f"{settings.FRONTEND_URL}/track/{order.tracking_token}",
    }
    message = EmailMultiAlternatives(
        subject=f"Your momus collective order {order.order_number}",
        body=render_to_string("orders/email/confirmation.txt", context),
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[recipient],
    )
    message.attach_alternative(
        render_to_string("orders/email/confirmation.html", context), "text/html"
    )
    message.send()
    order.confirmation_sent_at = timezone.now()
    order.save(update_fields=["confirmation_sent_at"])


@shared_task(
    autoretry_for=(EmailNotSent,),
    retry_backoff=True,
    max_retries=5,
)
def order_paid(order_id):
    """After the order commits: freeze each custom design's print file and
    email thumbnail, then confirm to the customer."""
    from designs.tasks import render_order_item_file

    from .models import Order

    order = Order.objects.select_related("user").get(id=order_id)
    for item in order.items.select_related("product"):
        if item.design_config:
            render_order_item_file(str(item.id), item.design_config)
    if order.confirmation_sent_at is None:
        send_order_confirmation(order)
