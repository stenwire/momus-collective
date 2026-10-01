import uuid

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from catalog.models import Product


class Review(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="reviews"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reviews"
    )
    order = models.ForeignKey(
        "orders.Order", on_delete=models.CASCADE, related_name="reviews"
    )
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    text = models.CharField(max_length=500, blank=True)
    # Only a review tied to a real, completed purchase carries this badge
    # (FR-REV-02) -- set from the order relationship, not user input.
    is_verified = models.BooleanField(default=True)
    is_visible = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["product", "order"], name="one_review_per_product_per_order"
            )
        ]

    def __str__(self):
        return f"{self.rating}* on {self.product_id} by {self.user_id}"
