from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .checkout import cart_lines, guest_lines, quote
from .locations import LAGOS_LGAS, NIGERIAN_STATES
from .serializers import QuoteRequestSerializer, quote_payload


@api_view(["GET"])
@permission_classes([AllowAny])
def checkout_options(request):
    """The state and Lagos LGA lists the shipping form offers (D-083)."""
    return Response({"states": list(NIGERIAN_STATES), "lagos_lgas": sorted(LAGOS_LGAS)})


def lines_for(request, data):
    if request.user.is_authenticated:
        return cart_lines(request.user)
    return guest_lines(data.get("items", []))


@api_view(["POST"])
@permission_classes([AllowAny])
def checkout_quote(request):
    """What the order will cost, computed entirely server-side (SEC-06)."""
    serializer = QuoteRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    return Response(quote_payload(quote(lines_for(request, serializer.validated_data))))
