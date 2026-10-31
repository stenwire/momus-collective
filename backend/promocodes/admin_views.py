from django.db.models import Count, Sum
from django.db.models.functions import Coalesce
from rest_framework import status, viewsets
from rest_framework.response import Response

from config.pagination import StandardPagination
from config.permissions import IsStaffUser

from .admin_serializers import AdminPromoCodeSerializer
from .models import PromoCode


class AdminPromoCodeViewSet(viewsets.ModelViewSet):
    """FR-ADM-09: create, edit, deactivate (PATCH is_active) and delete."""

    serializer_class = AdminPromoCodeSerializer
    permission_classes = [IsStaffUser]
    pagination_class = StandardPagination
    queryset = PromoCode.objects.annotate(
        redemption_count=Count("redemptions"),
        total_discount=Coalesce(Sum("redemptions__discount"), 0),
    ).order_by("-created_at")

    def destroy(self, request, *args, **kwargs):
        # Deleting would take its redemption history (and the per-customer
        # limits counted from it) with it (D-101).
        promo = self.get_object()
        if promo.redemption_count:
            return Response(
                {"detail": "This code has been used. Deactivate it instead."},
                status=status.HTTP_409_CONFLICT,
            )
        promo.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        promo = self.get_queryset().get(pk=response.data["id"])
        response.data = self.get_serializer(promo).data
        return response

    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)
        promo = self.get_queryset().get(pk=kwargs["pk"])
        response.data = self.get_serializer(promo).data
        return response
