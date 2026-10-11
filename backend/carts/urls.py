from django.urls import path

from . import views, wishlist_views

urlpatterns = [
    path("cart/", views.cart_detail, name="cart"),
    path("cart/items/", views.cart_add, name="cart-add"),
    path("cart/merge/", views.cart_merge, name="cart-merge"),
    path("cart/items/<uuid:pk>/", views.cart_item, name="cart-item"),
    path("wishlist/", wishlist_views.wishlist, name="wishlist"),
    path(
        "wishlist/<uuid:product_id>/",
        wishlist_views.wishlist_item,
        name="wishlist-item",
    ),
    path(
        "wishlist/<uuid:product_id>/move-to-cart/",
        wishlist_views.wishlist_move_to_cart,
        name="wishlist-move-to-cart",
    ),
]
