import uuid

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models

from catalog.models import Product


class SavedDesign(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="saved_designs"
    )
    name = models.CharField(max_length=100)
    # shirt_color, text, font, font_size, text_color, alignment,
    # letter_spacing, placement.
    config = models.JSONField(default=dict)
    preview_image_url = models.URLField(blank=True)
    design_file_url = models.URLField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class Cart(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="carts",
    )
    session_id = models.CharField(max_length=64, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(user__isnull=False) | ~models.Q(session_id=""),
                name="cart_has_user_or_session",
            )
        ]

    def __str__(self):
        return str(self.user_id or self.session_id)


class CartItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="cart_items",
    )
    saved_design = models.ForeignKey(
        SavedDesign,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="cart_items",
    )
    size = models.CharField(max_length=5)
    color = models.CharField(max_length=50)
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    unit_price = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            # A line item is a catalog product XOR a custom design, never
            # both and never neither.
            models.CheckConstraint(
                condition=(
                    models.Q(product__isnull=False, saved_design__isnull=True)
                    | models.Q(product__isnull=True, saved_design__isnull=False)
                ),
                name="cart_item_exactly_one_of_product_or_design",
            )
        ]

    def __str__(self):
        return f"{self.quantity}x in cart {self.cart_id}"
