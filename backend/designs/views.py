from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from carts.models import SavedDesign

from .options import public_options
from .serializers import SavedDesignSerializer


@api_view(["GET"])
@permission_classes([AllowAny])
def design_options(request):
    return Response(public_options())


class SavedDesignViewSet(viewsets.ModelViewSet):
    """FR-DES-08. Strictly the requester's own designs: another user's id
    404s rather than 403s, so ids can't be probed for existence."""

    serializer_class = SavedDesignSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return SavedDesign.objects.filter(user=self.request.user).order_by(
            "-updated_at"
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
