from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .options import public_options


@api_view(["GET"])
@permission_classes([AllowAny])
def design_options(request):
    return Response(public_options())
