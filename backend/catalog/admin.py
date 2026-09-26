from django.contrib import admin

from .models import Category, Collection, CollectionProduct, Product


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "display_order", "is_active")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("slogan", "category", "price", "is_active", "is_custom")
    list_filter = ("category", "is_active", "is_custom")
    prepopulated_fields = {"slug": ("slogan",)}


class CollectionProductInline(admin.TabularInline):
    model = CollectionProduct
    extra = 1


@admin.register(Collection)
class CollectionAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_featured", "display_order")
    prepopulated_fields = {"slug": ("name",)}
    inlines = [CollectionProductInline]
