from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from config.permissions import IsStaffUser

from .checkout import cart_lines, guest_lines, quote
from .delivery import delivery_settings, public_delivery_info
from .locations import LAGOS_LGAS, NIGERIAN_STATES
from .models import DeliverySettings
from .serializers import QuoteRequestSerializer, quote_payload


@api_view(["GET"])
@permission_classes([AllowAny])
def checkout_options(request):
    """The state and Lagos LGA lists the shipping form offers (D-083)."""
    return Response({"states": list(NIGERIAN_STATES), "lagos_lgas": sorted(LAGOS_LGAS)})


def lines_for(request, data):
    if request.user.is_authenticated:
        return cart_lines(request.user)
    return guest_lines(data.get("items", []))


@api_view(["POST"])
@permission_classes([AllowAny])
def checkout_quote(request):
    """What the order will cost, computed entirely server-side (SEC-06)."""
    serializer = QuoteRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data
    user = request.user if request.user.is_authenticated else None
    email = user.email if user else data["email"]
    result = quote(
        lines_for(request, data),
        data.get("shipping"),
        promo_code=data["promo_code"],
        user=user,
        email=email,
    )
    return Response(quote_payload(result))


@api_view(["GET"])
@permission_classes([AllowAny])
def delivery_info(request):
    """Band fees and the free-delivery threshold, for the bag's estimate."""
    return Response(public_delivery_info(delivery_settings()))


class DeliverySettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliverySettings
        exclude = ["id"]
        read_only_fields = ["updated_at"]

    def validate(self, attrs):
        merged = {**self.instance.__dict__, **attrs} if self.instance else attrs
        for area in ("lagos", "outside"):
            if merged[f"{area}_days_min"] > merged[f"{area}_days_max"]:
                raise serializers.ValidationError(
                    {f"{area}_days_min": "Must not exceed the maximum."}
                )
        return attrs


@api_view(["GET", "PATCH"])
@permission_classes([IsStaffUser])
def admin_delivery_settings(request):
    """FR-CART-08: the admin configures the band fees and threshold."""
    settings = delivery_settings()
    if request.method == "PATCH":
        serializer = DeliverySettingsSerializer(
            settings, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
    return Response(DeliverySettingsSerializer(settings).data)
