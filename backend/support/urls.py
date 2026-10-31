from django.urls import path

from .views import FileComplaint

urlpatterns = [
    path("support/complaints/", FileComplaint.as_view(), name="file-complaint"),
]
