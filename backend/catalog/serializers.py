from rest_framework import serializers

from .models import Category, Collection, Product


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
            "review_count",
            "created_at",
        ]


class ProductDetailSerializer(ProductListSerializer):
    related_products = serializers.SerializerMethodField()

    class Meta(ProductListSerializer.Meta):
        fields = [
            *ProductListSerializer.Meta.fields,
            "description",
            "shirt_colors",
            "related_products",
        ]

    def get_related_products(self, product):
        # FR-CAT-05: up to 4 from the same category, excluding itself.
        related = (
            Product.objects.filter(category=product.category, is_active=True)
            .exclude(pk=product.pk)
            .select_related("category")
            .order_by("-created_at")[:4]
        )
        return ProductListSerializer(related, many=True).data


TOP_RATED_SIZE = 8


def top_rated_collection():
    """FR-REV-04: a computed Top Rated carousel, best average first, among
    shirts with at least one visible review; none until there are some."""
    products = (
        Product.objects.filter(is_active=True, review_count__gt=0)
        .select_related("category")
        .order_by("-avg_rating", "-review_count", "-created_at")[:TOP_RATED_SIZE]
    )
    data = ProductListSerializer(products, many=True).data
    if not data:
        return None
    return {
        "id": "top-rated",
        "name": "Top Rated",
        "slug": "top-rated",
        "is_featured": False,
        "products": data,
    }


class CollectionSerializer(serializers.ModelSerializer):
    products = serializers.SerializerMethodField()

    class Meta:
        model = Collection
        fields = ["id", "name", "slug", "is_featured", "products"]

    def get_products(self, collection):
        # Ordered through CollectionProduct.display_order (its Meta.ordering),
        # not the M2M's arbitrary join order.
        products = (
            collection.products.filter(is_active=True)
            .select_related("category")
            .order_by("collectionproduct__display_order")
        )
        return ProductListSerializer(products, many=True).data
