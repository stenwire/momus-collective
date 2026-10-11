from django.db import transaction
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from config.permissions import IsStaffUser

from .models import CustomPricing, ShirtBlank
from .options import SHIRT_COLORS


class PricingUpdateSerializer(serializers.Serializer):
    print_cost = serializers.IntegerField(min_value=0, required=False)
    margin = serializers.IntegerField(min_value=0, required=False)
    blank_costs = serializers.DictField(
        child=serializers.IntegerField(min_value=0), required=False
    )

    def validate_blank_costs(self, value):
        unknown = set(value) - set(SHIRT_COLORS)
        if unknown:
            raise serializers.ValidationError(f"Unknown colours: {sorted(unknown)}")
        return value


def pricing_payload():
    pricing = CustomPricing.objects.get(pk=1)
    blanks = {b.color: b.blank_cost for b in ShirtBlank.objects.all()}
    return {
        "print_cost": pricing.print_cost,
        "margin": pricing.margin,
        "blank_costs": {color: blanks[color] for color in SHIRT_COLORS},
    }


@api_view(["GET", "PATCH"])
@permission_classes([IsStaffUser])
def admin_design_pricing(request):
    """FR-DES-11: the admin sets blank cost per colour, print cost and
    margin, all in kobo. A PATCH applies every field or none."""
    if request.method == "PATCH":
        serializer = PricingUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        with transaction.atomic():
            pricing = CustomPricing.objects.select_for_update().get(pk=1)
            for field in ("print_cost", "margin"):
                if field in data:
                    setattr(pricing, field, data[field])
            pricing.save()
            for color, cost in data.get("blank_costs", {}).items():
                ShirtBlank.objects.filter(color=color).update(blank_cost=cost)
    return Response(pricing_payload())
