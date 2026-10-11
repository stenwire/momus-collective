from django.urls import path

from . import admin_views, views

urlpatterns = [
    path("designs/options/", views.design_options, name="design-options"),
    path("designs/pricing/", views.design_pricing, name="design-pricing"),
    path("designs/<uuid:pk>/file/", views.design_file, name="design-file"),
    path(
        "admin/design-pricing/",
        admin_views.admin_design_pricing,
        name="admin-design-pricing",
    ),
]
