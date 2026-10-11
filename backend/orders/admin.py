from django.contrib import admin

from .models import DeliverySettings, Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("order_number", "status", "user", "total", "created_at")
    list_filter = ("status",)
    search_fields = ("order_number", "guest_email", "paystack_reference")
    inlines = [OrderItemInline]


@admin.register(DeliverySettings)
class DeliverySettingsAdmin(admin.ModelAdmin):
    list_display = (
        "lagos_within_fee",
        "lagos_cross_fee",
        "outside_lagos_fee",
        "free_delivery_threshold",
        "origin_side",
    )

    def has_add_permission(self, request):
        return not DeliverySettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False
