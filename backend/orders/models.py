import secrets
import uuid

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models

from carts.models import SavedDesign
from catalog.models import Product


class OrderStatus(models.TextChoices):
    PAID = "paid", "Paid"
    MODERATION = "moderation", "Moderation"
    SHIRT_ACQUIRED = "shirt_acquired", "Shirt Acquired"
    PRINTED = "printed", "Printed"
    OUT_FOR_DELIVERY = "out_for_delivery", "Out for Delivery"
    DELIVERED = "delivered", "Delivered"
    CANCELLED = "cancelled", "Cancelled"
    REFUNDED = "refunded", "Refunded"


def generate_tracking_token():
    """SEC-13: unguessable, unlike the sequential order_number."""
    return secrets.token_urlsafe(32)


class Order(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order_number = models.CharField(max_length=20, unique=True)
    tracking_token = models.CharField(
        max_length=64, unique=True, default=generate_tracking_token, editable=False
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders",
    )
    guest_email = models.EmailField(blank=True)
    guest_phone = models.CharField(max_length=20, blank=True)
    # Snapshot at order time. Deliberately not an FK: it must not follow a
    # later edit to the customer's saved Address (see /implement's own trap
    # list for this project).
    shipping_address = models.JSONField()
    subtotal = models.PositiveIntegerField(validators=[MinValueValidator(0)])
    delivery_fee = models.PositiveIntegerField(default=0)
    discount = models.PositiveIntegerField(default=0)
    total = models.PositiveIntegerField(validators=[MinValueValidator(0)])
    promo_code = models.ForeignKey(
        "promocodes.PromoCode",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders",
    )
    status = models.CharField(
        max_length=20, choices=OrderStatus.choices, default=OrderStatus.PAID
    )
    paystack_reference = models.CharField(max_length=100, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    status_history = models.JSONField(default=list)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            # Every order identifies a customer one way or the other.
            models.CheckConstraint(
                condition=models.Q(user__isnull=False)
                | (~models.Q(guest_email="") & ~models.Q(guest_phone="")),
                name="order_has_user_or_guest_contact",
            )
        ]

    def __str__(self):
        return self.order_number


class OrderItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="order_items",
    )
    saved_design = models.ForeignKey(
        SavedDesign,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="order_items",
    )
    slogan_text = models.CharField(max_length=255)
    size = models.CharField(max_length=5)
    color = models.CharField(max_length=50)
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    unit_price = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    design_file_url = models.URLField(blank=True)

    def __str__(self):
        return f"{self.quantity}x {self.slogan_text}"
