from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import User
from .serializers import RegistrationSerializer
from .tasks import send_password_reset_email, send_verification_email
from .tokens import (
    make_email_verification_token,
    password_reset_token,
    read_email_verification_token,
)


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


@api_view(["POST"])
@permission_classes([AllowAny])
def request_password_reset(request):
    email = request.data.get("email", "")
    user = User.objects.filter(email__iexact=email).first()
    # Same response whether or not the account exists, so the endpoint
    # cannot be used to enumerate registered emails.
    if user is not None:
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = password_reset_token.make_token(user)
        send_password_reset_email.delay(str(user.id), uid, token)
    return Response({"detail": "If that account exists, a reset link was sent."})


@api_view(["POST"])
@permission_classes([AllowAny])
def confirm_password_reset(request):
    uid = request.data.get("uid", "")
    token = request.data.get("token", "")
    new_password = request.data.get("password", "")

    try:
        user_id = force_str(urlsafe_base64_decode(uid))
        user = User.objects.get(pk=user_id)
    except (ValueError, TypeError, OverflowError, User.DoesNotExist):
        user = None

    if user is None or not password_reset_token.check_token(user, token):
        return Response(
            {"detail": "This reset link is invalid or has expired."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        validate_password(new_password, user=user)
    except DjangoValidationError as exc:
        return Response({"password": exc.messages}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.save(update_fields=["password"])
    return Response({"detail": "Password reset."})
