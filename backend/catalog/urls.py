from django.urls import path

from .views import (
    CategoryListView,
    CollectionListView,
    ProductDetailView,
    ProductListView,
)

urlpatterns = [
    path("products/", ProductListView.as_view(), name="product-list"),
    path("products/<slug:slug>/", ProductDetailView.as_view(), name="product-detail"),
    path("categories/", CategoryListView.as_view(), name="category-list"),
    path("collections/", CollectionListView.as_view(), name="collection-list"),
]
