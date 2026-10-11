"""Turns a paid checkout session into an order. Runs inside settle()'s
transaction, only on the one call that makes the session paid (T-412)."""

from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import F

from carts.models import CartItem, SavedDesign
from catalog.models import Product
from promocodes.services import record_use

from .models import Order, OrderItem, OrderStatus
from .numbering import generate_order_number

NUMBER_ATTEMPTS = 5


def _create_order(session):
    # The day's first orders have no rows to lock, so two can compute the
    # same number; the unique constraint catches it and we try the next.
    for attempt in range(NUMBER_ATTEMPTS):
        try:
            with transaction.atomic():
                return Order.objects.create(
                    order_number=generate_order_number(),
                    user=session.user,
                    guest_email="" if session.user else session.email,
                    guest_phone="" if session.user else session.phone,
                    shipping_address=session.shipping_address,
                    subtotal=session.subtotal,
                    delivery_fee=session.delivery_fee,
                    discount=session.discount,
                    total=session.total,
                    status=OrderStatus.PAID,
                    paystack_reference=session.reference,
                    paid_at=session.paid_at,
                    status_history=[
                        {
                            "status": OrderStatus.PAID,
                            "timestamp": session.paid_at.isoformat(),
                        }
                    ],
                )
        except IntegrityError:
            if attempt == NUMBER_ATTEMPTS - 1:
                raise


def fulfil(session):
    from designs.tasks import render_order_item_file

    order = _create_order(session)
    # Keyed by str: the session stores ids as strings, in_bulk returns UUIDs.
    designs = {
        str(pk): design
        for pk, design in SavedDesign.objects.in_bulk(
            [
                line["saved_design_id"]
                for line in session.lines
                if line["saved_design_id"]
            ]
        ).items()
    }
    for line in session.lines:
        item = OrderItem.objects.create(
            order=order,
            product_id=line["product_id"]
            if Product.objects.filter(id=line["product_id"]).exists()
            else None,
            saved_design=designs.get(line["saved_design_id"])
            if line["saved_design_id"]
            else None,
            slogan_text=line["slogan_text"],
            size=line["size"],
            color=line["color"],
            quantity=line["quantity"],
            unit_price=line["unit_price"],
            design_config=line.get("design_config"),
        )
        if line.get("design_config"):
            item.design_file_url = (
                f"{settings.BACKEND_URL}/api/v1/orders/items/{item.id}/design-file/"
            )
            item.save(update_fields=["design_file_url"])
            config = line["design_config"]
            transaction.on_commit(
                lambda i=str(item.id), c=config: render_order_item_file.delay(i, c)
            )
        if line["product_id"]:
            Product.objects.filter(id=line["product_id"]).update(
                total_orders=F("total_orders") + line["quantity"]
            )
    if session.promo_code and record_use(
        session.promo_code, order, session.user, session.email, session.discount
    ):
        order.notes = (
            f"Promo {session.promo_code} was over its limit when paid; honoured."
        )
        order.save(update_fields=["notes"])
    if session.user:
        CartItem.objects.filter(cart__user=session.user).delete()
    session.order = order
    session.save(update_fields=["order"])
    return order
