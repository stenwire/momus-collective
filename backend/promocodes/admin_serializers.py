from rest_framework import serializers

from .models import DiscountType, PromoCode


class AdminPromoCodeSerializer(serializers.ModelSerializer):
    """FR-ADM-09. The tracking figures are read-only, annotated by the view."""

    redemptions = serializers.IntegerField(source="redemption_count", read_only=True)
    total_discount = serializers.IntegerField(read_only=True)
    remaining_uses = serializers.SerializerMethodField()

    class Meta:
        model = PromoCode
        fields = [
            "id",
            "code",
            "discount_type",
            "discount_value",
            "min_order_value",
            "max_uses",
            "max_uses_per_user",
            "expires_at",
            "is_active",
            "uses_count",
            "redemptions",
            "total_discount",
            "remaining_uses",
            "created_at",
        ]
        read_only_fields = ["uses_count", "created_at"]

    def get_remaining_uses(self, promo):
        if promo.max_uses is None:
            return None
        return max(promo.max_uses - promo.uses_count, 0)

    def validate_code(self, value):
        code = value.strip().upper()
        if not code or not code.replace("-", "").replace("_", "").isalnum():
            raise serializers.ValidationError("Use letters, numbers, - or _.")
        clash = PromoCode.objects.filter(code__iexact=code)
        if self.instance:
            clash = clash.exclude(pk=self.instance.pk)
        if clash.exists():
            raise serializers.ValidationError("A code with this name already exists.")
        return code

    def validate_max_uses(self, value):
        if value is not None and value < 1:
            raise serializers.ValidationError(
                "Leave empty for unlimited, or use 1 or more."
            )
        return value

    def validate_max_uses_per_user(self, value):
        if value < 1:
            raise serializers.ValidationError("Each customer needs at least one use.")
        return value

    def validate(self, attrs):
        kind = attrs.get("discount_type", getattr(self.instance, "discount_type", None))
        value = attrs.get(
            "discount_value", getattr(self.instance, "discount_value", None)
        )
        if kind == DiscountType.PERCENTAGE and value is not None and value > 100:
            raise serializers.ValidationError(
                {"discount_value": "A percentage can't be more than 100."}
            )
        return attrs
