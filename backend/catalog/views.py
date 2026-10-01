from rest_framework.generics import ListAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny

from .models import Product
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
        return (
            Product.objects.filter(is_active=True)
            .select_related("category")
            .order_by("display_order", "-created_at")
        )
