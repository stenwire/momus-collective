"""Messages to the customer about their order. Email always; WhatsApp
joins by their preference in T-507 (FR-NOT-02, FR-NOT-03)."""

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

from .models import Channel
from .services import send_once


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
