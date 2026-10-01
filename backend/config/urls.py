from django.contrib import admin
from django.urls import include, path

# All DRF routes mount here (D-011, API-01). Additive-only within v1; a
# removal, rename, tightened validation or changed status code needs v2.
urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include("config.api_urls")),
]
