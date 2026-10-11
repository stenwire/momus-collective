"""FR-ADM-08: the admin's numbers. Revenue is the order total of paid orders
that weren't cancelled or refunded; Paystack's fee isn't revenue (D-098)."""

from datetime import timedelta

from django.db.models import Count, Exists, OuterRef, Q, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone

from .models import Order, OrderItem, OrderStatus

NOT_REVENUE = [OrderStatus.CANCELLED, OrderStatus.REFUNDED]
TREND_DAYS = 30


def _revenue(orders):
    return orders.aggregate(total=Sum("total"))["total"] or 0


def analytics(now=None):
    now = timezone.localtime(now or timezone.now())
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    counted = Order.objects.exclude(status__in=NOT_REVENUE)
    lines = OrderItem.objects.exclude(order__status__in=NOT_REVENUE)

    totals = counted.aggregate(
        all_time=Sum("total"),
        orders=Count("id"),
        today=Sum("total", filter=Q(created_at__gte=today)),
        week=Sum(
            "total", filter=Q(created_at__gte=today - timedelta(days=today.weekday()))
        ),
        month=Sum("total", filter=Q(created_at__gte=today.replace(day=1))),
    )
    revenue = {k: totals[k] or 0 for k in ("today", "week", "month", "all_time")}

    by_status = dict(
        Order.objects.values_list("status").annotate(n=Count("id")).order_by()
    )
    top = (
        lines.filter(product__isnull=False)
        .values("product_id", "product__slug", "product__slogan")
        .annotate(quantity=Sum("quantity"), orders=Count("order", distinct=True))
        .order_by("-quantity", "product__slogan")[:10]
    )
    categories = (
        lines.filter(product__isnull=False)
        .values("product__category__name")
        .annotate(orders=Count("order", distinct=True), quantity=Sum("quantity"))
        .order_by("-orders", "product__category__name")
    )
    has_custom = Exists(
        OrderItem.objects.filter(order=OuterRef("pk"), design_config__isnull=False)
    )
    custom = counted.filter(has_custom).count()
    start = today - timedelta(days=TREND_DAYS - 1)
    daily = {
        row["day"]: row
        for row in counted.filter(created_at__gte=start)
        .annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(revenue=Sum("total"), orders=Count("id"))
    }
    trend = []
    for i in range(TREND_DAYS):
        day = (start + timedelta(days=i)).date()
        row = daily.get(day, {})
        trend.append(
            {
                "date": day.isoformat(),
                "revenue": row.get("revenue") or 0,
                "orders": row.get("orders") or 0,
            }
        )

    return {
        "revenue": revenue,
        "average_order_value": revenue["all_time"] // totals["orders"]
        if totals["orders"]
        else 0,
        "orders_by_status": [
            {"status": value, "label": label, "count": by_status.get(value, 0)}
            for value, label in OrderStatus.choices
        ],
        "top_products": [
            {
                "id": str(row["product_id"]),
                "slug": row["product__slug"],
                "slogan": row["product__slogan"],
                "quantity": row["quantity"],
                "orders": row["orders"],
            }
            for row in top
        ],
        "categories": [
            {
                "name": row["product__category__name"],
                "orders": row["orders"],
                "quantity": row["quantity"],
            }
            for row in categories
        ],
        "custom_vs_catalog": {"custom": custom, "catalog": totals["orders"] - custom},
        "trend": trend,
    }
