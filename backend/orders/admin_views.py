"""Staff-only order management (FR-ADM-02, FR-ADM-03). Every view asserts
IsStaffUser: 401 anonymous, 403 customer (NFR-04)."""

from django.db.models import Count, Prefetch
from django.shortcuts import get_object_or_404
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from config.permissions import IsStaffUser

from .models import Order, OrderItem
from .status import BOARD, change_status

BOARD_LIMIT = 50


def admin_card(order):
    items = list(order.items.all())
    return {
        "id": str(order.id),
        "order_number": order.order_number,
        "status": order.status,
        "created_at": order.created_at.isoformat(),
        "customer": order.shipping_address.get("full_name", ""),
        "item_count": sum(item.quantity for item in items),
        "has_custom": any(item.design_config for item in items),
        "total": order.total,
    }


def with_items(queryset):
    return queryset.prefetch_related(
        Prefetch(
            "items",
            queryset=OrderItem.objects.only("order_id", "quantity", "design_config"),
        )
    )


@api_view(["GET"])
@permission_classes([IsStaffUser])
def admin_order_board(request):
    """Each column's newest orders; Delivered and Cancelled only grow, so
    every column is capped and carries its full count."""
    counts = dict(
        Order.objects.values_list("status").annotate(n=Count("id")).order_by()
    )
    columns = []
    for status in BOARD:
        orders = with_items(
            Order.objects.filter(status=status).order_by("-created_at")
        )[:BOARD_LIMIT]
        columns.append(
            {
                "status": status,
                "label": status.label,
                "count": counts.get(status, 0),
                "orders": [admin_card(order) for order in orders],
            }
        )
    return Response({"columns": columns})


class StatusSerializer(serializers.Serializer):
    status = serializers.CharField()
    note = serializers.CharField(required=False, allow_blank=True, max_length=500)


@api_view(["PATCH"])
@permission_classes([IsStaffUser])
def admin_order_status(request, pk):
    get_object_or_404(Order, pk=pk)
    serializer = StatusSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    order, _ = change_status(
        pk,
        serializer.validated_data["status"],
        by=request.user.email,
        note=serializer.validated_data.get("note", ""),
    )
    return Response(admin_card(with_items(Order.objects.filter(pk=order.pk)).get()))
