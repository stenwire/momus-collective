from django.contrib import admin

from .models import Cart, CartItem, SavedDesign


class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "session_id", "updated_at")
    inlines = [CartItemInline]


@admin.register(SavedDesign)
class SavedDesignAdmin(admin.ModelAdmin):
    list_display = ("name", "user", "updated_at")
