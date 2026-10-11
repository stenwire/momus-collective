from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from .checkout import quote
from .models import CheckoutSession


def line_snapshot(line):
    design = line.saved_design
    return {
        "product_id": str(line.product.id) if line.product else None,
        "saved_design_id": str(design.id) if design else None,
        "title": line.title,
        "slogan_text": design.config["text"] if design else line.product.slogan,
        "image": (line.product.mockup_images or [None])[0] if line.product else None,
        "size": line.size,
        "color": line.color,
        "quantity": line.quantity,
        "unit_price": line.unit_price,
        # Frozen so the print file is the design as ordered (D-086).
        "design_config": design.config if design else None,
    }


def open_session(lines, shipping, contact_email, user, promo_code=""):
    """Freezes the server's quote with the full address: what Paystack is
    asked to charge and what the order will record (SEC-06)."""
    result = quote(
        lines, shipping, promo_code=promo_code, user=user, email=contact_email
    )
    if result.promo_error:
        raise ValidationError({"promo_code": result.promo_error})
    if result.delivery_fee is None:
        raise ValidationError({"shipping": "Add a delivery address."})
    if result.total <= 0:
        raise ValidationError({"items": "This order has nothing to pay."})
    return CheckoutSession.objects.create(
        user=user,
        email=contact_email,
        phone=shipping["phone"],
        shipping_address=shipping,
        lines=[line_snapshot(line) for line in result.lines],
        subtotal=result.subtotal,
        delivery_fee=result.delivery_fee,
        discount=result.discount,
        total=result.total,
        promo_code=result.promo_code or "",
    )


class AmountMismatch(Exception):
    pass


def settle(reference, paystack_data):
    """Records Paystack's verdict on a session and returns (session,
    newly_paid). Exactly one call ever sees newly_paid: the row lock makes
    a replayed webhook, or a webhook racing the browser's verify, find the
    session already paid and change nothing (T-412)."""
    with transaction.atomic():
        session = CheckoutSession.objects.select_for_update().get(reference=reference)
        if session.status == CheckoutSession.Status.PAID:
            return session, False
        if paystack_data.get("status") != "success":
            session.status = CheckoutSession.Status.FAILED
            session.save(update_fields=["status"])
            return session, False
        if (
            paystack_data.get("amount") != session.total
            or paystack_data.get("currency") != "NGN"
        ):
            raise AmountMismatch(reference)
        session.status = CheckoutSession.Status.PAID
        session.paid_at = timezone.now()
        session.save(update_fields=["status", "paid_at"])
        # Same transaction: if the order can't be created, the payment isn't
        # recorded either, and Paystack's retry or the next verify tries again.
        from .fulfilment import fulfil

        fulfil(session)
        return session, True
