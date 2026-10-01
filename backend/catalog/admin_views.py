from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from config.permissions import IsStaffUser

from .admin_serializers import AdminCategorySerializer, AdminProductSerializer
from .models import Category, Product


class AdminProductViewSet(viewsets.ModelViewSet):
    """FR-ADM-04. Delete is a true DELETE for genuine removal; "archive" is
    PATCH {is_active: false} through the ordinary update endpoint."""

    serializer_class = AdminProductSerializer
    permission_classes = [IsStaffUser]
    queryset = Product.objects.select_related("category").order_by(
        "category", "display_order"
    )

    @action(detail=False, methods=["post"])
    def bulk_price(self, request):
        updates = request.data.get("updates", [])
        if not isinstance(updates, list) or not updates:
            return Response(
                {"detail": "updates must be a non-empty list."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ids = [u.get("id") for u in updates]
        prices = {u.get("id"): u.get("price") for u in updates}
        products = list(Product.objects.filter(pk__in=ids))
        if len(products) != len(set(ids)):
            return Response(
                {"detail": "One or more product ids were not found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        validate_price = MinValueValidator(1)
        for product in products:
            price = prices[str(product.pk)]
            try:
                validate_price(price)
            except (ValidationError, TypeError):
                return Response(
                    {"detail": f"Invalid price for product {product.pk}: {price!r}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            product.price = price

        with transaction.atomic():
            Product.objects.bulk_update(products, ["price"])
        return Response(AdminProductSerializer(products, many=True).data)

    @action(detail=False, methods=["post"])
    def reorder(self, request):
        # [{id, display_order}, ...] within one category, matching
        # FR-ADM-04's "reorder products within a category."
        updates = request.data.get("updates", [])
        if not isinstance(updates, list) or not updates:
            return Response(
                {"detail": "updates must be a non-empty list."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ids = [u.get("id") for u in updates]
        orders = {u.get("id"): u.get("display_order") for u in updates}
        products = list(Product.objects.filter(pk__in=ids))
        if len(products) != len(set(ids)):
            return Response(
                {"detail": "One or more product ids were not found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        for product in products:
            product.display_order = orders[str(product.pk)]

        with transaction.atomic():
            Product.objects.bulk_update(products, ["display_order"])
        return Response(AdminProductSerializer(products, many=True).data)


class AdminCategoryViewSet(viewsets.ModelViewSet):
    """FR-ADM-05. "Archive" is PATCH {is_active: false}; no delete action
    is exposed since Category.product's FK is on_delete=PROTECT."""

    serializer_class = AdminCategorySerializer
    permission_classes = [IsStaffUser]
    queryset = Category.objects.order_by("display_order", "name")
