from rest_framework import serializers

from designs.options import SHIRT_COLORS

from .models import Category, Collection, CollectionProduct, Product


class AdminProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = [
            "id",
            "slogan",
            "slug",
            "category",
            "price",
            "description",
            "shirt_colors",
            "mockup_images",
            "tags",
            "is_active",
            "is_custom",
            "display_order",
            "total_orders",
            "avg_rating",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "total_orders",
            "avg_rating",
            "created_at",
            "updated_at",
        ]

    def validate_shirt_colors(self, value):
        # SPC-03: the same seven the design tool offers (DRY-06, D-077).
        if not isinstance(value, list) or not all(isinstance(c, str) for c in value):
            raise serializers.ValidationError("Must be a list of colour names.")
        unknown = [c for c in value if c not in SHIRT_COLORS]
        if unknown:
            raise serializers.ValidationError(
                f"Not stocked: {unknown}. Choose from {list(SHIRT_COLORS)}."
            )
        if len(set(value)) != len(value):
            raise serializers.ValidationError("List each colour once.")
        return value


class AdminCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "display_order",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class AdminCollectionProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = CollectionProduct
        fields = ["id", "collection", "product", "display_order"]
        read_only_fields = ["id"]


class AdminCollectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Collection
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "is_featured",
            "display_order",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]
