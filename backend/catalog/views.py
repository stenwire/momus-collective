from django.db.models import Count, Q
from rest_framework.generics import ListAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Category, Product
from .serializers import ProductListSerializer


class ProductPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class ProductListView(ListAPIView):
    serializer_class = ProductListSerializer
    pagination_class = ProductPagination
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = (
            Product.objects.filter(is_active=True)
            .select_related("category")
            .order_by("display_order", "-created_at")
        )
        category_slug = self.request.query_params.get("category")
        if category_slug:
            queryset = queryset.filter(category__slug=category_slug)
        return queryset


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
