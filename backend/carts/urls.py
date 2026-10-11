from django.urls import path

from . import views

urlpatterns = [
    path("cart/", views.cart_detail, name="cart"),
    path("cart/items/", views.cart_add, name="cart-add"),
    path("cart/items/<uuid:pk>/", views.cart_item, name="cart-item"),
]
