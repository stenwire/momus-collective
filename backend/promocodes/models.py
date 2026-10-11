import uuid

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models


class DiscountType(models.TextChoices):
    PERCENTAGE = "percentage", "Percentage"
    FLAT = "flat", "Flat"


class PromoCode(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=32, unique=True)
    discount_type = models.CharField(max_length=10, choices=DiscountType.choices)
    # Percentage: whole points (10 = 10%). Flat: NGN minor units. Never a
    # float either way (SPC-14).
    discount_value = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    min_order_value = models.PositiveIntegerField(null=True, blank=True)
    max_uses = models.PositiveIntegerField(null=True, blank=True)
    max_uses_per_user = models.PositiveIntegerField(default=1)
    uses_count = models.PositiveIntegerField(default=0)
    expires_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.code


class PromoRedemption(models.Model):
    """One use of a code, so per-customer limits can be counted (FR-CART-07).
    Guests are counted by email (D-085)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    promo_code = models.ForeignKey(
        PromoCode, on_delete=models.CASCADE, related_name="redemptions"
    )
    order = models.OneToOneField(
        "orders.Order", on_delete=models.CASCADE, related_name="promo_redemption"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="promo_redemptions",
    )
    email = models.EmailField()
    discount = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["promo_code", "email"])]

    def __str__(self):
        return f"{self.promo_code_id} on {self.order_id}"
