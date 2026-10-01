from rest_framework import serializers

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
