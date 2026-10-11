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
