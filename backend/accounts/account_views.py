from django.db import IntegrityError, transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .serializers import (
    AccountSettingsSerializer,
    EmailChangeRequestSerializer,
    PasswordChangeSerializer,
)
from .tasks import send_email_change_confirmation
from .tokens import make_email_change_token, read_email_change_token


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def account_settings(request):
    if request.method == "GET":
        return Response(AccountSettingsSerializer(request.user).data)

    serializer = AccountSettingsSerializer(
        request.user, data=request.data, partial=True
    )
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def request_email_change(request):
    serializer = EmailChangeRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    new_email = serializer.validated_data["new_email"]

    token = make_email_change_token(request.user, new_email)
    send_email_change_confirmation.delay(new_email, token)
    return Response({"detail": "Check the new address for a confirmation link."})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def confirm_email_change(request):
    from .models import User

    token = request.data.get("token", "")
    payload = read_email_change_token(token)
    if payload is None or payload["user_id"] != str(request.user.id):
        return Response(
            {"detail": "This confirmation link is invalid or has expired."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    new_email = payload["new_email"]
    email_taken = (
        User.objects.filter(email__iexact=new_email)
        .exclude(pk=request.user.pk)
        .exists()
    )
    if email_taken:
        return Response(
            {"detail": "An account with this email address already exists."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    request.user.email = new_email
    try:
        # A savepoint, not a bare save: once a query fails inside a
        # transaction, Postgres aborts it and every further query raises
        # until rollback. atomic() scopes that rollback to this block alone.
        with transaction.atomic():
            request.user.save(update_fields=["email"])
    except IntegrityError:
        # The .exists() check above is a TOCTOU race: two confirmations for
        # the same target email could both pass it. The database's own
        # unique constraint is the real guard; this just turns its failure
        # into the same friendly response instead of an unhandled 500.
        return Response(
            {"detail": "An account with this email address already exists."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    return Response({"detail": "Email address updated."})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_password(request):
    serializer = PasswordChangeSerializer(
        data=request.data, context={"request": request}
    )
    serializer.is_valid(raise_exception=True)
    request.user.set_password(serializer.validated_data["new_password"])
    request.user.save(update_fields=["password"])
    return Response({"detail": "Password changed."})
