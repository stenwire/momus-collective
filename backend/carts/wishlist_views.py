"""FR-USR-05: hearted products, kept on the account, movable to the bag."""

from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from catalog.models import Product
from catalog.options import SIZES

from .models import WishlistItem
from .services import add_line, user_cart


def wishlist_payload(user):
    items = WishlistItem.objects.filter(user=user).select_related("product")
    return [
        {
            "product": {
                "id": str(item.product.id),
                "slug": item.product.slug,
                "slogan": item.product.slogan,
                "price": item.product.price,
                "image": item.product.mockup_images[0]
                if item.product.mockup_images
                else None,
                "shirt_colors": item.product.shirt_colors,
                "available": item.product.is_active,
            },
            "added_at": item.created_at.isoformat(),
        }
        for item in items
    ]


class AddSerializer(serializers.Serializer):
    product = serializers.UUIDField()


class MoveSerializer(serializers.Serializer):
    size = serializers.ChoiceField(choices=SIZES)
    color = serializers.CharField(required=False, allow_blank=True, default="")


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def wishlist(request):
    if request.method == "POST":
        serializer = AddSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product = get_object_or_404(
            Product, pk=serializer.validated_data["product"], is_active=True
        )
        try:
            with transaction.atomic():
                WishlistItem.objects.create(user=request.user, product=product)
        except IntegrityError:
            pass  # Already hearted: adding again is a no-op.
        return Response(wishlist_payload(request.user), status=status.HTTP_201_CREATED)
    return Response(wishlist_payload(request.user))


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def wishlist_item(request, product_id):
    WishlistItem.objects.filter(user=request.user, product_id=product_id).delete()
    return Response(wishlist_payload(request.user))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def wishlist_move_to_cart(request, product_id):
    entry = get_object_or_404(
        WishlistItem.objects.select_related("product"),
        user=request.user,
        product_id=product_id,
    )
    serializer = MoveSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    with transaction.atomic():
        add_line(
            user_cart(request.user),
            product=entry.product,
            size=serializer.validated_data["size"],
            color=serializer.validated_data["color"],
            quantity=1,
        )
        entry.delete()
    return Response(wishlist_payload(request.user))
