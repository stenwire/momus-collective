from django.conf import settings
from django.core.files.base import ContentFile
from django.db import transaction
from django.http import Http404
from django.utils.text import slugify
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from carts.models import SavedDesign
from catalog.admin_serializers import AdminProductSerializer
from catalog.models import Category, Product
from config.permissions import IsStaffUser

from .models import CustomPricing, ShirtBlank
from .options import SHIRT_COLORS
from .pricing import price_list
from .render import render_mockup_png
from .storage import design_storage, mockup_file_name


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


class ConvertDesignSerializer(serializers.Serializer):
    category = serializers.PrimaryKeyRelatedField(queryset=Category.objects.all())


def unique_slug(text):
    base = slugify(text)[:40] or "design"
    slug, n = base, 2
    while Product.objects.filter(slug=slug).exists():
        slug, n = f"{base}-{n}", n + 1
    return slug


@api_view(["POST"])
@permission_classes([IsStaffUser])
def admin_convert_design(request, pk):
    """Snapshot a saved design into a draft product; later edits to the
    design never change the product."""
    design = SavedDesign.objects.filter(pk=pk).first()
    if design is None:
        raise Http404
    serializer = ConvertDesignSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    config = design.config
    slogan = config["text"].split("\n")[0].strip()[:255]
    with transaction.atomic():
        product = Product.objects.create(
            slogan=slogan,
            slug=unique_slug(slogan),
            category=serializer.validated_data["category"],
            price=price_list()[config["shirt_color"]],
            shirt_colors=[config["shirt_color"]],
            is_active=False,
        )
        design_storage().save(
            mockup_file_name(product.id),
            ContentFile(render_mockup_png(config, size=800)),
        )
        product.mockup_images = [f"{settings.BACKEND_URL}/api/v1/mockups/{product.id}/"]
        product.save(update_fields=["mockup_images"])
    return Response(AdminProductSerializer(product).data, status=201)
