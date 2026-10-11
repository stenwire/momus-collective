from django.conf import settings
from rest_framework import serializers

from carts.services import MAX_LINE_QUANTITY


class GuestLineSerializer(serializers.Serializer):
    product = serializers.UUIDField()
    size = serializers.CharField()
    color = serializers.CharField(required=False, allow_blank=True, default="")
    quantity = serializers.IntegerField(min_value=1, max_value=MAX_LINE_QUANTITY)


class ShippingAreaSerializer(serializers.Serializer):
    state = serializers.CharField(required=False, allow_blank=True, default="")
    lga = serializers.CharField(required=False, allow_blank=True, default="")


class QuoteRequestSerializer(serializers.Serializer):
    """Only identifiers and choices are read; any price, total or discount
    a client sends is simply not a field here (SEC-06)."""

    items = GuestLineSerializer(many=True, required=False, max_length=50)
    shipping = ShippingAreaSerializer(required=False)
    promo_code = serializers.CharField(required=False, allow_blank=True, default="")
    email = serializers.EmailField(required=False, allow_blank=True, default="")


def quote_payload(quote):
    return {
        "lines": [
            {
                "title": line.title,
                "size": line.size,
                "color": line.color,
                "quantity": line.quantity,
                "unit_price": line.unit_price,
                "line_total": line.total,
            }
            for line in quote.lines
        ],
        "subtotal": quote.subtotal,
        "delivery_fee": quote.delivery_fee,
        "delivery_band": quote.delivery_band,
        "discount": quote.discount,
        "promo_code": quote.promo_code,
        "promo_error": quote.promo_error,
        "total": quote.total,
        "notes": quote.notes,
    }


class ShippingSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=150)
    phone = serializers.RegexField(r"^\+?[0-9 ]{7,15}$", max_length=20)
    address_line_1 = serializers.CharField(max_length=255)
    address_line_2 = serializers.CharField(
        max_length=255, required=False, allow_blank=True, default=""
    )
    city = serializers.CharField(max_length=100)
    state = serializers.CharField(max_length=50)
    lga = serializers.CharField(max_length=100)
    notes = serializers.CharField(
        max_length=500, required=False, allow_blank=True, default=""
    )


class CheckoutRequestSerializer(serializers.Serializer):
    items = GuestLineSerializer(many=True, required=False, max_length=50)
    shipping = ShippingSerializer()
    email = serializers.EmailField(required=False, allow_blank=True, default="")
    promo_code = serializers.CharField(required=False, allow_blank=True, default="")


def item_payload(item):
    product = item.product
    return {
        "id": str(item.id),
        "kind": "design" if item.saved_design_id or item.design_config else "product",
        "slogan_text": item.slogan_text,
        "size": item.size,
        "color": item.color,
        "quantity": item.quantity,
        "unit_price": item.unit_price,
        "line_total": item.unit_price * item.quantity,
        "product": {
            "slug": product.slug,
            "image": product.mockup_images[0] if product.mockup_images else None,
        }
        if product
        else None,
        "design_config": item.design_config,
    }


def order_payload(order, delivery, include_shipping=False):
    """The customer's view of an order. Contact details and the address
    appear only for the owner (SEC-14); the tracking link carries none."""
    from .delivery import estimated_delivery
    from .models import OrderStatus

    labels = dict(OrderStatus.choices)
    payload = {
        "order_number": order.order_number,
        "status": order.status,
        "status_label": labels[order.status],
        "status_history": [
            {**entry, "label": labels.get(entry["status"], entry["status"])}
            for entry in order.status_history
        ],
        "created_at": order.created_at.isoformat(),
        "items": [item_payload(item) for item in order.items.all()],
        "subtotal": order.subtotal,
        "delivery_fee": order.delivery_fee,
        "discount": order.discount,
        "total": order.total,
        "estimated_delivery": estimated_delivery(order, delivery),
        "tracking_url": f"{settings.FRONTEND_URL}/track/{order.tracking_token}",
    }
    if include_shipping:
        payload["shipping_address"] = order.shipping_address
    return payload
