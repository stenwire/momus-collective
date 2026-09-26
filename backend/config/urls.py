from django.contrib import admin
from django.urls import path

# All DRF routes mount under /api/v1/ (D-011). App routes join here as they land.
urlpatterns = [
    path("admin/", admin.site.urls),
]
