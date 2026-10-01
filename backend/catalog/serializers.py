from rest_framework import serializers

from .models import Category, Product


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "slug"]


class ProductListSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "slogan",
            "slug",
            "category",
            "price",
            "mockup_images",
            "tags",
            "total_orders",
            "avg_rating",
            "created_at",
        ]
