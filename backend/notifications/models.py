import uuid

from django.db import models

from orders.models import Order


class Channel(models.TextChoices):
    EMAIL = "email", "Email"
    WHATSAPP = "whatsapp", "WhatsApp"


class Notification(models.Model):
    """One row per message sent, so a retried task never sends it twice.
    Holds no recipient or message text (SEC-14)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name="notifications"
    )
    kind = models.CharField(max_length=40)
    channel = models.CharField(max_length=10, choices=Channel.choices)
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["order", "kind", "channel"], name="one_notification_per_kind"
            )
        ]

    def __str__(self):
        return f"{self.kind} by {self.channel}"
