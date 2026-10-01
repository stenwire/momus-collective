import uuid

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
