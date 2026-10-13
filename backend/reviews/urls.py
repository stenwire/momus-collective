from django.urls import path

from . import admin_views, views

urlpatterns = [
    path(
        "products/<slug:slug>/reviews/",
        views.ProductReviews.as_view(),
        name="product-reviews",
    ),
    path(
        "products/<slug:slug>/reviews/eligibility/",
        views.review_eligibility,
        name="review-eligibility",
    ),
    path("admin/reviews/", admin_views.admin_review_list, name="admin-reviews"),
    path(
        "admin/reviews/<uuid:pk>/",
        admin_views.admin_review_moderate,
        name="admin-review-moderate",
    ),
]
