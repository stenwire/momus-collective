from django.urls import path

from . import views

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
]
