from rest_framework import serializers

from catalog.models import Product

from .models import CartItem, SavedDesign
from .services import MAX_LINE_QUANTITY, unit_price


class CartItemSerializer(serializers.ModelSerializer):
    kind = serializers.SerializerMethodField()
    product = serializers.SerializerMethodField()
    design = serializers.SerializerMethodField()
    unit_price = serializers.SerializerMethodField()
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = [
            "id",
            "kind",
            "product",
            "design",
            "size",
            "color",
            "quantity",
            "unit_price",
            "line_total",
        ]

    def get_kind(self, item):
        return "product" if item.product_id else "design"

    def get_product(self, item):
        if not item.product_id:
            return None
        p = item.product
        return {
            "id": str(p.id),
            "slug": p.slug,
            "slogan": p.slogan,
            "image": p.mockup_images[0] if p.mockup_images else None,
        }

    def get_design(self, item):
        if not item.saved_design_id:
            return None
        d = item.saved_design
        return {"id": str(d.id), "name": d.name, "config": d.config}

    def get_unit_price(self, item):
        return unit_price(item, self.context["prices"])

    def get_line_total(self, item):
        return self.get_unit_price(item) * item.quantity


class AddItemSerializer(serializers.Serializer):
    product = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(), required=False
    )
    saved_design = serializers.PrimaryKeyRelatedField(
        queryset=SavedDesign.objects.all(), required=False
    )
    size = serializers.CharField()
    color = serializers.CharField(required=False, allow_blank=True, default="")
    quantity = serializers.IntegerField(
        min_value=1, max_value=MAX_LINE_QUANTITY, default=1
    )

    def validate(self, attrs):
        if bool(attrs.get("product")) == bool(attrs.get("saved_design")):
            raise serializers.ValidationError(
                "Add either a product or a saved design, not both."
            )
        return attrs


class QuantitySerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=1, max_value=MAX_LINE_QUANTITY)


class MergeLineSerializer(serializers.Serializer):
    product = serializers.UUIDField()
    size = serializers.CharField()
    color = serializers.CharField(required=False, allow_blank=True, default="")
    quantity = serializers.IntegerField(min_value=1, max_value=MAX_LINE_QUANTITY)


class MergeSerializer(serializers.Serializer):
    # A guest cart holds catalog lines only (D-075, D-082).
    items = MergeLineSerializer(many=True, max_length=50)
