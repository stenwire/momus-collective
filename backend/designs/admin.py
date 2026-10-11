from django.contrib import admin

from .models import CustomPricing, ShirtBlank


@admin.register(ShirtBlank)
class ShirtBlankAdmin(admin.ModelAdmin):
    list_display = ("color", "blank_cost", "updated_at")


@admin.register(CustomPricing)
class CustomPricingAdmin(admin.ModelAdmin):
    list_display = ("print_cost", "margin", "updated_at")

    def has_add_permission(self, request):
        return not CustomPricing.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False
