from django.urls import path

from . import admin_views, views

urlpatterns = [
    path("designs/options/", views.design_options, name="design-options"),
    path("designs/pricing/", views.design_pricing, name="design-pricing"),
    path("designs/<uuid:pk>/file/", views.design_file, name="design-file"),
    path("mockups/<uuid:pk>/", views.mockup_image, name="mockup-image"),
    path(
        "admin/designs/<uuid:pk>/convert/",
        admin_views.admin_convert_design,
        name="admin-convert-design",
    ),
    path(
        "admin/design-pricing/",
        admin_views.admin_design_pricing,
        name="admin-design-pricing",
    ),
]
