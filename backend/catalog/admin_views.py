from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from config.permissions import IsStaffUser

from .admin_serializers import (
    AdminCategorySerializer,
    AdminCollectionSerializer,
    AdminProductSerializer,
)
from .models import Category, Collection, CollectionProduct, Product


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


class AdminCollectionViewSet(viewsets.ModelViewSet):
    """FR-ADM-06. Featured flag and display order are ordinary fields on
    the CRUD serializer; product membership is managed through the two
    actions below, since CollectionProduct is a through-table the plain
    collection serializer doesn't expose for writing."""

    serializer_class = AdminCollectionSerializer
    permission_classes = [IsStaffUser]
    queryset = Collection.objects.order_by("display_order", "name")

    @action(detail=True, methods=["post"])
    def add_product(self, request, pk=None):
        collection = self.get_object()
        product_id = request.data.get("product_id")
        product = Product.objects.filter(pk=product_id).first()
        if product is None:
            return Response(
                {"detail": "product_id did not match a product."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        display_order = request.data.get("display_order", 0)
        _, created = CollectionProduct.objects.get_or_create(
            collection=collection,
            product=product,
            defaults={"display_order": display_order},
        )
        return Response(
            {"added": created}, status=status.HTTP_201_CREATED if created else 200
        )

    @action(detail=True, methods=["post"])
    def remove_product(self, request, pk=None):
        collection = self.get_object()
        product_id = request.data.get("product_id")
        deleted, _ = CollectionProduct.objects.filter(
            collection=collection, product_id=product_id
        ).delete()
        if deleted == 0:
            return Response(
                {"detail": "That product is not in this collection."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)
