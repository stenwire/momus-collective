from django.db.models import Count, Q
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Category, Collection, Product
from .serializers import (
    CollectionSerializer,
    ProductDetailSerializer,
    ProductListSerializer,
)


class ProductPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


SORT_OPTIONS = {
    "newest": ("-created_at",),
    "price_asc": ("price",),
    "price_desc": ("-price",),
    "popular": ("-total_orders",),
}


class ProductListView(ListAPIView):
    serializer_class = ProductListSerializer
    pagination_class = ProductPagination
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = Product.objects.filter(is_active=True).select_related("category")

        category_slug = self.request.query_params.get("category")
        if category_slug:
            queryset = queryset.filter(category__slug=category_slug)

        search = self.request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(slogan__icontains=search) | Q(category__name__icontains=search)
            )

        sort = self.request.query_params.get("sort", "newest")
        order_fields = SORT_OPTIONS.get(sort, SORT_OPTIONS["newest"])
        return queryset.order_by(*order_fields)


class ProductDetailView(RetrieveAPIView):
    serializer_class = ProductDetailSerializer
    permission_classes = [AllowAny]
    lookup_field = "slug"

    def get_queryset(self):
        return Product.objects.filter(is_active=True).select_related("category")


class CollectionListView(ListAPIView):
    """FR-CAT-06: homepage carousels. A small, admin-curated set -- one
    query per collection for its products is acceptable here; EFF-01's
    constant-query-count requirement targets the product grid, not this."""

    serializer_class = CollectionSerializer
    permission_classes = [AllowAny]
    pagination_class = None

    def get_queryset(self):
        return Collection.objects.filter(is_active=True)


class CategoryListView(APIView):
    """FR-CAT-02: category buttons with a live product count each, plus an
    "All" count. One annotated query, not one COUNT per category (EFF-01)."""

    permission_classes = [AllowAny]

    def get(self, request):
        categories = Category.objects.filter(is_active=True).annotate(
            product_count=Count("products", filter=Q(products__is_active=True))
        )
        data = [
            {
                "id": str(c.id),
                "name": c.name,
                "slug": c.slug,
                "product_count": c.product_count,
            }
            for c in categories
        ]
        total = Product.objects.filter(is_active=True).count()
        return Response({"all_count": total, "categories": data})
