"""Staff-only order management (FR-ADM-02, FR-ADM-03). Every view asserts
IsStaffUser: 401 anonymous, 403 customer (NFR-04)."""

from django.conf import settings
from django.db.models import Case, Count, IntegerField, Prefetch, Q, Value, When
from django.shortcuts import get_object_or_404
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from config.permissions import IsStaffUser

from .models import Order, OrderItem, OrderStatus, RejectionReason
from .moderation import approve_design, mark_refunded, reject_design
from .serializers import item_payload
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


# FR-ADM-02's list view sorts by date, status and amount; status sorts in
# pipeline order, not alphabetically.
ORDERINGS = {
    "date": "created_at",
    "status": "status_rank",
    "amount": "total",
}
STATUS_RANK = Case(
    *(
        When(status=status, then=Value(i))
        for i, status in enumerate(OrderStatus.values)
    ),
    output_field=IntegerField(),
)


class AdminOrderPagination(PageNumberPagination):
    page_size = 25


@api_view(["GET"])
@permission_classes([IsStaffUser])
def admin_order_list(request):
    orders = Order.objects.all()
    status = request.query_params.get("status", "")
    if status:
        if status not in OrderStatus.values:
            raise serializers.ValidationError({"status": "Unknown status."})
        orders = orders.filter(status=status)
    search = request.query_params.get("search", "").strip()
    if search:
        orders = orders.filter(
            Q(order_number__icontains=search)
            | Q(guest_email__icontains=search)
            | Q(user__email__icontains=search)
            | Q(shipping_address__full_name__icontains=search)
        )
    sort = request.query_params.get("ordering", "-date")
    field = ORDERINGS.get(sort.lstrip("-"))
    if field is None:
        raise serializers.ValidationError(
            {"ordering": "Sort by date, status or amount."}
        )
    direction = "-" if sort.startswith("-") else ""
    orders = with_items(
        orders.annotate(status_rank=STATUS_RANK).order_by(
            f"{direction}{field}", "-created_at"
        )
    )
    paginator = AdminOrderPagination()
    page = paginator.paginate_queryset(orders, request)
    labels = dict(OrderStatus.choices)
    return paginator.get_paginated_response(
        [{**admin_card(order), "status_label": labels[order.status]} for order in page]
    )


def admin_detail(order):
    """FR-ADM-03: everything the admin needs to fulfil one order."""
    labels = dict(OrderStatus.choices)
    address = order.shipping_address
    redemption = getattr(order, "promo_redemption", None)
    return {
        "id": str(order.id),
        "order_number": order.order_number,
        "status": order.status,
        "status_label": labels[order.status],
        "created_at": order.created_at.isoformat(),
        "paid_at": order.paid_at.isoformat() if order.paid_at else None,
        "customer": {
            "name": address.get("full_name", ""),
            "phone": address.get("phone", ""),
            "email": order.user.email if order.user else order.guest_email,
            "has_account": order.user_id is not None,
        },
        "shipping_address": address,
        "items": [
            {
                **item_payload(item),
                "design_file_url": item.design_file_url or None,
            }
            for item in order.items.all()
        ],
        "payment": {
            "reference": order.paystack_reference,
            "subtotal": order.subtotal,
            "delivery_fee": order.delivery_fee,
            "discount": order.discount,
            "promo_code": redemption.promo_code.code if redemption else None,
            "total": order.total,
        },
        "status_history": [
            {**entry, "label": labels.get(entry["status"], entry["status"])}
            for entry in order.status_history
        ],
        "notes": order.notes,
        "tracking_url": f"{settings.FRONTEND_URL}/track/{order.tracking_token}",
    }


class NotesSerializer(serializers.Serializer):
    notes = serializers.CharField(allow_blank=True, max_length=2000)


@api_view(["GET", "PATCH"])
@permission_classes([IsStaffUser])
def admin_order_detail(request, pk):
    queryset = Order.objects.select_related(
        "user", "promo_redemption__promo_code"
    ).prefetch_related("items__product")
    order = get_object_or_404(queryset, pk=pk)
    if request.method == "PATCH":
        serializer = NotesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order.notes = serializer.validated_data["notes"]
        order.save(update_fields=["notes", "updated_at"])
    return Response(admin_detail(order))


def _moderation_entry(order):
    return {
        "id": str(order.id),
        "order_number": order.order_number,
        "created_at": order.created_at.isoformat(),
        "customer": order.shipping_address.get("full_name", ""),
        "designs": [
            {**item_payload(item), "design_file_url": item.design_file_url or None}
            for item in order.items.all()
            if item.design_config
        ],
        "rejection": {
            "reason": order.rejection_reason,
            "reason_label": order.get_rejection_reason_display(),
            "details": order.rejection_details,
            "rejected_at": order.rejected_at.isoformat(),
            "customer_choice": order.customer_choice,
        }
        if order.rejected_at
        else None,
    }


@api_view(["GET"])
@permission_classes([IsStaffUser])
def admin_moderation_queue(request):
    """FR-ADM-07: designs awaiting review, oldest first, then rejected ones
    waiting on the customer to revise or take a refund."""
    orders = list(
        Order.objects.filter(status=OrderStatus.MODERATION)
        .order_by("created_at")
        .prefetch_related("items__product")
    )
    review = [o for o in orders if not o.rejected_at]
    waiting = [o for o in orders if o.rejected_at]
    return Response(
        {
            "count": len(review),
            "orders": [_moderation_entry(o) for o in review],
            "waiting": [_moderation_entry(o) for o in waiting],
            "reasons": [{"key": k, "label": v} for k, v in RejectionReason.choices],
        }
    )


def _moderation_action(request, pk, action, **kwargs):
    get_object_or_404(Order, pk=pk)
    order = action(pk, by=request.user.email, **kwargs)
    return Response({"id": str(order.id), "status": order.status})


@api_view(["POST"])
@permission_classes([IsStaffUser])
def admin_moderation_approve(request, pk):
    return _moderation_action(request, pk, approve_design)


class RejectSerializer(serializers.Serializer):
    reason = serializers.CharField()
    details = serializers.CharField(required=False, allow_blank=True, max_length=500)


@api_view(["POST"])
@permission_classes([IsStaffUser])
def admin_moderation_reject(request, pk):
    serializer = RejectSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    return _moderation_action(
        request,
        pk,
        reject_design,
        reason=serializer.validated_data["reason"],
        details=serializer.validated_data.get("details", ""),
    )


@api_view(["POST"])
@permission_classes([IsStaffUser])
def admin_moderation_refunded(request, pk):
    return _moderation_action(request, pk, mark_refunded)


@api_view(["GET"])
@permission_classes([IsStaffUser])
def admin_analytics(request):
    from .analytics import analytics

    return Response(analytics())
