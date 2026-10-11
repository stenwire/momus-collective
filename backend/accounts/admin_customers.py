"""FR-ADM-10: the admin's view of registered customers and their orders."""

from django.db.models import Count, F, Max, Q, Sum
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from config.permissions import IsStaffUser
from orders.admin_views import admin_card, with_items
from orders.analytics import NOT_REVENUE
from orders.models import Order, OrderStatus

from .models import User

ORDERINGS = {
    "name": "first_name",
    "orders": "order_count",
    "spent": "total_spent",
    "last_order": "last_order_at",
    "joined": "created_at",
}


def customers():
    # Spend follows the analytics rule: cancelled and refunded don't count.
    return User.objects.filter(is_staff=False).annotate(
        order_count=Count("orders", distinct=True),
        total_spent=Coalesce(
            Sum("orders__total", filter=~Q(orders__status__in=NOT_REVENUE)), 0
        ),
        last_order_at=Max("orders__created_at"),
    )


def customer_row(user):
    return {
        "id": str(user.id),
        "name": f"{user.first_name} {user.last_name}".strip(),
        "email": user.email,
        "phone": user.phone,
        "order_count": user.order_count,
        "total_spent": user.total_spent,
        "last_order_at": user.last_order_at.isoformat() if user.last_order_at else None,
        "joined_at": user.created_at.isoformat(),
    }


class CustomerPagination(PageNumberPagination):
    page_size = 25


@api_view(["GET"])
@permission_classes([IsStaffUser])
def admin_customer_list(request):
    users = customers()
    search = request.query_params.get("search", "").strip()
    if search:
        users = users.filter(
            Q(first_name__icontains=search)
            | Q(last_name__icontains=search)
            | Q(email__icontains=search)
            | Q(phone__icontains=search)
        )
    sort = request.query_params.get("ordering", "-last_order")
    field = ORDERINGS.get(sort.lstrip("-"))
    if field is None:
        raise serializers.ValidationError(
            {"ordering": f"Sort by {', '.join(ORDERINGS)}."}
        )
    # Customers with no orders sort last either way.
    expression = F(field).desc if sort.startswith("-") else F(field).asc
    users = users.order_by(expression(nulls_last=True), "email")
    paginator = CustomerPagination()
    page = paginator.paginate_queryset(users, request)
    return paginator.get_paginated_response([customer_row(u) for u in page])


@api_view(["GET"])
@permission_classes([IsStaffUser])
def admin_customer_detail(request, pk):
    user = get_object_or_404(customers(), pk=pk)
    orders = with_items(Order.objects.filter(user=user).order_by("-created_at"))
    labels = dict(OrderStatus.choices)
    return Response(
        {
            **customer_row(user),
            "notification_pref": user.notification_pref,
            "is_verified": user.is_verified,
            "orders": [
                {**admin_card(order), "status_label": labels[order.status]}
                for order in orders
            ],
        }
    )
