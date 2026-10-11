from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from catalog.models import Product
from designs.pricing import price_list

from .models import CartItem
from .serializers import (
    AddItemSerializer,
    CartItemSerializer,
    MergeSerializer,
    QuantitySerializer,
)
from .services import add_line, user_cart


def cart_payload(cart):
    items = cart.items.select_related("product", "saved_design").order_by("created_at")
    data = CartItemSerializer(items, many=True, context={"prices": price_list()}).data
    return {
        "items": data,
        "item_count": sum(i["quantity"] for i in data),
        "subtotal": sum(i["line_total"] for i in data),
    }


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def cart_detail(request):
    """FR-CART-01: a signed-in user's server cart. Guests keep theirs in
    localStorage until they sign in (D-082)."""
    return Response(cart_payload(user_cart(request.user)))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def cart_add(request):
    serializer = AddItemSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    cart = user_cart(request.user)
    add_line(cart, **serializer.validated_data)
    return Response(cart_payload(cart), status=status.HTTP_201_CREATED)


@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def cart_item(request, pk):
    cart = user_cart(request.user)
    line = get_object_or_404(CartItem, pk=pk, cart=cart)
    if request.method == "DELETE":
        line.delete()
    else:
        serializer = QuantitySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        line.quantity = serializer.validated_data["quantity"]
        line.save(update_fields=["quantity"])
    return Response(cart_payload(cart))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def cart_merge(request):
    """FR-CART-01: a guest's localStorage lines join the server cart on
    login. Never a replace: matching lines add up (capped), and a line that
    can no longer be added is reported back rather than dropped silently."""
    serializer = MergeSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    cart = user_cart(request.user)
    lines = serializer.validated_data["items"]
    products = Product.objects.in_bulk([line["product"] for line in lines])
    skipped = []
    for line in lines:
        product = products.get(line["product"])
        try:
            if product is None:
                raise ValidationError({"product": "This product no longer exists."})
            add_line(
                cart,
                product=product,
                size=line["size"],
                color=line["color"],
                quantity=line["quantity"],
            )
        except ValidationError as error:
            skipped.append({"product": str(line["product"]), "reason": error.detail})
    return Response({**cart_payload(cart), "skipped": skipped})
