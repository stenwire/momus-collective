from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .serializers import RegistrationSerializer
from .tasks import send_verification_email
from .tokens import make_email_verification_token, read_email_verification_token


@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    serializer = RegistrationSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    token = make_email_verification_token(user)
    send_verification_email.delay(str(user.id), token)
    return Response(
        {"id": str(user.id), "email": user.email}, status=status.HTTP_201_CREATED
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def verify_email(request):
    token = request.data.get("token", "")
    user_id = read_email_verification_token(token)
    if user_id is None:
        return Response(
            {"detail": "This verification link is invalid or has expired."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    from .models import User

    updated = User.objects.filter(id=user_id).update(is_verified=True)
    if not updated:
        return Response(
            {"detail": "Account not found."}, status=status.HTTP_404_NOT_FOUND
        )
    return Response({"detail": "Email verified."})
