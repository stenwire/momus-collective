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


class DeliverySettings(models.Model):
    """FR-CART-08, the single row the admin edits: flat fees per band in
    kobo, a free-delivery threshold, and delivery windows for estimates."""

    lagos_within_fee = models.PositiveIntegerField()
    lagos_cross_fee = models.PositiveIntegerField()
    outside_lagos_fee = models.PositiveIntegerField()
    free_delivery_threshold = models.PositiveIntegerField(null=True, blank=True)
    origin_side = models.CharField(
        max_length=10, choices=[("mainland", "Mainland"), ("island", "Island")]
    )
    lagos_days_min = models.PositiveSmallIntegerField()
    lagos_days_max = models.PositiveSmallIntegerField()
    outside_days_min = models.PositiveSmallIntegerField()
    outside_days_max = models.PositiveSmallIntegerField()
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(id=1), name="delivery_settings_singleton"
            )
        ]

    def __str__(self):
        return "Delivery settings"


def generate_payment_reference():
    return f"MOMPAY-{secrets.token_hex(10)}"


class CheckoutSession(models.Model):
    """What the customer agreed to pay, frozen when they press Pay, before
    any order exists (the order status enum starts at Paid). One Paystack
    transaction each; a retry is a new session with a new reference."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PAID = "paid", "Paid"
        FAILED = "failed", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference = models.CharField(
        max_length=40, unique=True, default=generate_payment_reference, editable=False
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="checkout_sessions",
    )
    email = models.EmailField()
    phone = models.CharField(max_length=20)
    shipping_address = models.JSONField()
    lines = models.JSONField()
    subtotal = models.PositiveIntegerField()
    delivery_fee = models.PositiveIntegerField()
    discount = models.PositiveIntegerField(default=0)
    total = models.PositiveIntegerField()
    promo_code = models.CharField(max_length=32, blank=True)
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.PENDING
    )
    order = models.OneToOneField(
        Order,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="checkout_session",
    )
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.reference
