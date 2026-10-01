from django.db import transaction
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Address
from .serializers import AddressSerializer


class AddressViewSet(viewsets.ModelViewSet):
    serializer_class = AddressSerializer

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        self._save_respecting_default(serializer)

    def perform_update(self, serializer):
        self._save_respecting_default(serializer)

    def _save_respecting_default(self, serializer):
        # The one-default-per-user constraint is enforced at the database
        # (D-032), so promoting a new default must clear the old one first,
        # inside the same transaction, or the insert/update raises IntegrityError.
        with transaction.atomic():
            if serializer.validated_data.get("is_default"):
                current_pk = serializer.instance.pk if serializer.instance else None
                Address.objects.filter(user=self.request.user, is_default=True).exclude(
                    pk=current_pk
                ).update(is_default=False)
            serializer.save(user=self.request.user)

    @action(detail=True, methods=["post"])
    def set_default(self, request, pk=None):
        address = self.get_object()
        with transaction.atomic():
            Address.objects.filter(user=request.user, is_default=True).exclude(
                pk=address.pk
            ).update(is_default=False)
            address.is_default = True
            address.save(update_fields=["is_default"])
        return Response(AddressSerializer(address).data)
