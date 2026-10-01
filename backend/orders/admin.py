from django.contrib import admin

from .models import Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("order_number", "status", "user", "total", "created_at")
    list_filter = ("status",)
    search_fields = ("order_number", "guest_email", "paystack_reference")
    inlines = [OrderItemInline]
