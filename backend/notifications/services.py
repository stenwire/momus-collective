from django.db import transaction

from orders.models import Order

from .models import Notification


def send_once(order, kind, channel, send):
    """Sends unless already sent. The order row is locked so two workers
    can't both send; a failed send records nothing, so a retry sends it."""
    with transaction.atomic():
        Order.objects.select_for_update().filter(pk=order.pk).first()
        if Notification.objects.filter(
            order=order, kind=kind, channel=channel
        ).exists():
            return False
        send()
        Notification.objects.create(order=order, kind=kind, channel=channel)
    return True
