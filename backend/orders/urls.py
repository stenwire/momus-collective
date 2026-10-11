from django.urls import path

from . import admin_views, views, webhooks

urlpatterns = [
    path("checkout/options/", views.checkout_options, name="checkout-options"),
    path("checkout/quote/", views.checkout_quote, name="checkout-quote"),
    path("checkout/", views.checkout_start, name="checkout-start"),
    path("checkout/verify/", views.checkout_verify, name="checkout-verify"),
    path("checkout/cancel/", views.checkout_cancel, name="checkout-cancel"),
    path(
        "orders/items/<uuid:pk>/design-file/",
        views.order_item_design_file,
        name="order-item-design-file",
    ),
    path("orders/", views.order_history, name="order-history"),
    path("orders/track/<str:token>/", views.order_track, name="order-track"),
    path(
        "orders/track/<str:token>/items/<uuid:item_id>/preview/",
        views.order_item_preview,
        name="order-item-preview",
    ),
    path(
        "payments/paystack/webhook/",
        webhooks.paystack_webhook,
        name="paystack-webhook",
    ),
    path("checkout/delivery/", views.delivery_info, name="checkout-delivery"),
    path("admin/orders/", admin_views.admin_order_list, name="admin-order-list"),
    path(
        "admin/orders/<uuid:pk>/",
        admin_views.admin_order_detail,
        name="admin-order-detail",
    ),
    path(
        "admin/orders/board/", admin_views.admin_order_board, name="admin-order-board"
    ),
    path(
        "admin/orders/<uuid:pk>/status/",
        admin_views.admin_order_status,
        name="admin-order-status",
    ),
    path(
        "admin/moderation/",
        admin_views.admin_moderation_queue,
        name="admin-moderation",
    ),
    path(
        "admin/moderation/<uuid:pk>/approve/",
        admin_views.admin_moderation_approve,
        name="admin-moderation-approve",
    ),
    path(
        "admin/delivery-settings/",
        views.admin_delivery_settings,
        name="admin-delivery-settings",
    ),
]
