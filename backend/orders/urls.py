from django.urls import path

from . import views

urlpatterns = [
    path("checkout/options/", views.checkout_options, name="checkout-options"),
    path("checkout/quote/", views.checkout_quote, name="checkout-quote"),
    path("checkout/", views.checkout_start, name="checkout-start"),
    path("checkout/verify/", views.checkout_verify, name="checkout-verify"),
    path("checkout/delivery/", views.delivery_info, name="checkout-delivery"),
    path(
        "admin/delivery-settings/",
        views.admin_delivery_settings,
        name="admin-delivery-settings",
    ),
]
