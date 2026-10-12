"""Messages to the customer about their order. Email always; WhatsApp
joins by their preference in T-507 (FR-NOT-02, FR-NOT-03)."""

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

from accounts.models import NotificationPref
from orders.models import OrderStatus

from . import whatsapp
from .models import Channel
from .services import send_once

# FR-NOT-02: what each change means for the customer. Paid isn't here: a
# move back to it is the admin correcting a mistake.
STATUS_MESSAGES = {
    OrderStatus.SHIRT_ACQUIRED: (
        "We've got your shirt and it's on its way to the printer."
    ),
    OrderStatus.PRINTED: "Your shirt is printed and being packed for delivery.",
    OrderStatus.OUT_FOR_DELIVERY: "Your order is out for delivery with our rider.",
    OrderStatus.DELIVERED: "Your order has been delivered. Enjoy wearing it!",
    OrderStatus.CANCELLED: (
        "Your order has been cancelled. Reply to this email if that's unexpected."
    ),
    OrderStatus.REFUNDED: (
        "We've refunded your payment. It can take a few days to reach your account."
    ),
}


def recipient(order):
    return order.user.email if order.user else order.guest_email


def tracking_url(order):
    return f"{settings.FRONTEND_URL}/track/{order.tracking_token}"


def send_email(order, kind, template, subject, context):
    def send():
        full = {"order": order, "tracking_url": tracking_url(order), **context}
        message = EmailMultiAlternatives(
            subject=subject,
            body=render_to_string(f"notifications/email/{template}.txt", full),
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[recipient(order)],
        )
        message.attach_alternative(
            render_to_string(f"notifications/email/{template}.html", full), "text/html"
        )
        message.send()

    return send_once(order, kind, Channel.EMAIL, send)


def design_outcome(order, outcome):
    if outcome == "approved":
        return send_email(
            order,
            "design_approved",
            "design_approved",
            f"Your design is approved: order {order.order_number}",
            {},
        )
    # Each rejection (after a revision) is its own message.
    rejections = sum(
        1
        for e in order.status_history
        if e.get("note", "").startswith("Design rejected")
    )
    return send_email(
        order,
        f"design_rejected:{rejections}",
        "design_rejected",
        f"We can't print your design yet: order {order.order_number}",
        {
            "reason": order.get_rejection_reason_display(),
            "details": order.rejection_details,
        },
    )


def channels(order):
    """Guests get email. A WhatsApp preference falls back to email while no
    provider can message customers (D-093), so nobody misses an update."""
    pref = order.user.notification_pref if order.user else NotificationPref.EMAIL
    sender = whatsapp.provider()
    whatsapp_ready = sender.can_message_customers and sender.configured()
    wants_whatsapp = pref in (NotificationPref.WHATSAPP, NotificationPref.BOTH)
    email = (
        pref in (NotificationPref.EMAIL, NotificationPref.BOTH) or not whatsapp_ready
    )
    return email, wants_whatsapp and whatsapp_ready, sender


def status_update(order, entry_index):
    status = order.status_history[entry_index]["status"]
    if status not in STATUS_MESSAGES:
        return
    label = OrderStatus(status).label
    description = STATUS_MESSAGES[status]
    kind = f"status:{entry_index}"
    email, by_whatsapp, sender = channels(order)
    if email:
        send_email(
            order,
            kind,
            "status_update",
            f"Order {order.order_number}: {label}",
            {"label": label, "description": description},
        )
    if by_whatsapp:
        phone = (order.user.phone if order.user else "") or order.shipping_address.get(
            "phone", ""
        )
        text = (
            f"momus collective: order {order.order_number} is now {label}. "
            f"{description} Track it: {tracking_url(order)}"
        )
        send_once(order, kind, Channel.WHATSAPP, lambda: sender.send(phone, text))


REVIEW_PROMPT_DELAY_DAYS = 3


def review_links(order):
    """One link per catalog shirt not yet reviewed for this order; custom
    designs have no product page to review."""
    from reviews.models import Review

    reviewed = set(
        Review.objects.filter(order=order).values_list("product_id", flat=True)
    )
    seen, links = set(), []
    for item in order.items.all():
        product = item.product
        if product is None or not product.is_active:
            continue
        if product.id in reviewed or product.id in seen:
            continue
        seen.add(product.id)
        links.append(
            {
                "slogan": product.slogan,
                "url": f"{settings.FRONTEND_URL}/product/{product.slug}"
                f"?review={order.tracking_token}#reviews",
            }
        )
    return links


def review_prompt(order):
    """FR-REV-05. Sent once per order; nothing if there's nothing to review."""
    links = review_links(order)
    if not links:
        return False
    return send_email(
        order,
        "review_prompt",
        "review_prompt",
        f"How's your shirt? Review order {order.order_number}",
        {"links": links},
    )
