from django.contrib import admin

from .models import PromoCode


@admin.register(PromoCode)
class PromoCodeAdmin(admin.ModelAdmin):
    list_display = (
        "code",
        "discount_type",
        "discount_value",
        "uses_count",
        "is_active",
    )
    list_filter = ("discount_type", "is_active")
