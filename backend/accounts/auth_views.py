from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from google.auth.exceptions import GoogleAuthError
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import AuthProvider, User

# Remember Me unchecked: session-length only (browser close). Checked: the
# full 30 days FR-USR-02 names. Both are refresh-token lifetimes; the access
# token lifetime never changes.
REMEMBER_ME_LIFETIME = timedelta(days=30)
SESSION_ONLY_LIFETIME = timedelta(hours=12)


def issue_token_pair(user, remember_me):
    lifetime = REMEMBER_ME_LIFETIME if remember_me else SESSION_ONLY_LIFETIME
    refresh = RefreshToken.for_user(user)
    refresh.set_exp(from_time=timezone.now(), lifetime=lifetime)
    return {"access": str(refresh.access_token), "refresh": str(refresh)}


class RememberMeTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        # Form-encoded and query-string bodies send "false" as a truthy
        # string; only a real boolean or the literal string forms count.
        raw = self.context["request"].data.get("remember_me", False)
        remember_me = str(raw).strip().lower() in ("true", "1")
        data.update(issue_token_pair(self.user, remember_me))
        return data


class LoginView(TokenObtainPairView):
    serializer_class = RememberMeTokenObtainPairSerializer


@api_view(["POST"])
@permission_classes([AllowAny])
def google_login(request):
    credential = request.data.get("credential", "")
    if not credential:
        return Response(
            {"detail": "credential is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        claims = google_id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            settings.GOOGLE_OAUTH_CLIENT_ID,
        )
    except (GoogleAuthError, ValueError):
        return Response(
            {"detail": "Invalid Google credential."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    email = claims.get("email")
    if not email or not claims.get("email_verified"):
        return Response(
            {"detail": "Google account has no verified email."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    # Google already verified this email; linking by it avoids forcing a
    # customer who registered with email/password into a second account.
    user, created = User.objects.get_or_create(
        email__iexact=email,
        defaults={
            "email": email,
            "first_name": claims.get("given_name", ""),
            "last_name": claims.get("family_name", ""),
            "phone": "",
            "is_verified": True,
            "auth_provider": AuthProvider.GOOGLE,
        },
    )
    if not created and user.auth_provider != AuthProvider.GOOGLE:
        user.auth_provider = AuthProvider.GOOGLE
        user.is_verified = True
        user.save(update_fields=["auth_provider", "is_verified"])

    raw = request.data.get("remember_me", False)
    remember_me = str(raw).strip().lower() in ("true", "1")
    return Response(issue_token_pair(user, remember_me))
