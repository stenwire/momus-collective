from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .locations import LAGOS_LGAS, NIGERIAN_STATES


@api_view(["GET"])
@permission_classes([AllowAny])
def checkout_options(request):
    """The state and Lagos LGA lists the shipping form offers (D-083)."""
    return Response({"states": list(NIGERIAN_STATES), "lagos_lgas": sorted(LAGOS_LGAS)})
