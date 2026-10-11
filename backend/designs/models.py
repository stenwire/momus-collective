from django.db import models

from .options import SHIRT_COLORS


class ShirtBlank(models.Model):
    """FR-DES-11: what a blank costs in each colour, in kobo."""

    color = models.CharField(
        max_length=50, unique=True, choices=[(c, c) for c in SHIRT_COLORS]
    )
    blank_cost = models.PositiveIntegerField()
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.color


class CustomPricing(models.Model):
    """The single row holding print cost and margin, in kobo (FR-DES-11)."""

    print_cost = models.PositiveIntegerField()
    margin = models.PositiveIntegerField()
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(id=1), name="custom_pricing_singleton"
            )
        ]

    def __str__(self):
        return "Custom design pricing"
