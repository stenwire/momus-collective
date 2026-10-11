from django.http import FileResponse, Http404
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from carts.models import SavedDesign

from .options import public_options
from .serializers import SavedDesignSerializer
from .storage import design_file_name, design_storage, discard_design_file
from .tasks import generate_design_file


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

    def perform_update(self, serializer):
        # A print file rendered from the old config must never ship.
        new_config = serializer.validated_data.get("config")
        if new_config is not None and new_config != serializer.instance.config:
            discard_design_file(serializer.instance.id)
            serializer.save(design_file_url="")
        else:
            serializer.save()

    def perform_destroy(self, instance):
        discard_design_file(instance.id)
        instance.delete()

    @action(detail=True, methods=["post"])
    def export(self, request, pk=None):
        """FR-DES-09: render the print file off the request path (EFF-07)."""
        design = self.get_object()
        generate_design_file.delay(str(design.id))
        return Response({"status": "queued"}, status=status.HTTP_202_ACCEPTED)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def design_file(request, pk):
    """SEC-15: the owner or staff only; anyone else sees a 404."""
    design = SavedDesign.objects.filter(pk=pk).first()
    if design is None or not (
        design.user_id == request.user.id or request.user.is_staff
    ):
        raise Http404
    storage, name = design_storage(), design_file_name(design.id)
    if not design.design_file_url or not storage.exists(name):
        raise Http404
    return FileResponse(
        storage.open(name, "rb"),
        content_type="image/png",
        as_attachment=True,
        filename=f"momus-design-{design.id}.png",
    )
