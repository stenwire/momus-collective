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
        "total": quote.total,
        "notes": quote.notes,
    }
