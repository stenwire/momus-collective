import uuid

from django.db import models


class Complaint(models.Model):
    class Topic(models.TextChoices):
        ORDER = "order", "Order issue"
        DELIVERY = "delivery", "Delivery"
        QUALITY = "quality", "Product quality"
        PAYMENT = "payment", "Payment"
        PRIVACY = "privacy", "Privacy or account"
        OTHER = "other", "Other"

    class Status(models.TextChoices):
        OPEN = "open", "Open"
        RESOLVED = "resolved", "Resolved"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField()
    order_number = models.CharField(max_length=32, blank=True)
    topic = models.CharField(max_length=16, choices=Topic.choices)
    details = models.TextField(max_length=3000)
    status = models.CharField(
        max_length=12, choices=Status.choices, default=Status.OPEN
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.topic}: {self.email}"
