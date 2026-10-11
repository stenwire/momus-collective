from django.urls import path

from . import views

urlpatterns = [
    path("designs/options/", views.design_options, name="design-options"),
    path("designs/<uuid:pk>/file/", views.design_file, name="design-file"),
]
