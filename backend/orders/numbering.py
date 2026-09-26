from django.db import transaction
from django.utils import timezone


def generate_order_number(now=None):
    """MOM-YYYYMMDD-NNN, sequence resetting daily. Locks the day's row set
    to avoid a race producing two orders with the same number."""
    from .models import Order

    now = now or timezone.now()
    date_part = now.strftime("%Y%m%d")
    prefix = f"MOM-{date_part}-"
    with transaction.atomic():
        count = (
            Order.objects.select_for_update()
            .filter(order_number__startswith=prefix)
            .count()
        )
        return f"{prefix}{count + 1:03d}"
