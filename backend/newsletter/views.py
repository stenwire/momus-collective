from rest_framework import serializers, status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from config.throttling import scoped

from .services import subscribe, unsubscribe


class SubscribeSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([ScopedRateThrottle])
@scoped("newsletter")
def newsletter_subscribe(request):
    """FR-NOT-04. The reply is the same whether or not the address was
    already on the list, so the form can't reveal who subscribes."""
    serializer = SubscribeSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    subscribe(serializer.validated_data["email"])
    return Response({"detail": "You're on the list."}, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([ScopedRateThrottle])
@scoped("newsletter")
def newsletter_unsubscribe(request):
    if unsubscribe(str(request.data.get("token", ""))) is None:
        return Response(
            {"detail": "This unsubscribe link isn't valid."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    return Response({"detail": "You've been unsubscribed."})
