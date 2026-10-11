"""Cookie-based browser sessions (D-080). Tokens travel only in httpOnly
cookies and never appear in a response body a script could read."""

from django.middleware.csrf import get_token
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from config.authentication import (
    REFRESH_COOKIE,
    clear_auth_cookies,
    enforce_csrf,
    set_auth_cookies,
)
from config.throttling import scoped

from .auth_views import (
    REMEMBER_ME_LIFETIME,
    RememberMeTokenObtainPairSerializer,
    issue_token_pair,
)
from .models import User


def _user_payload(user):
    return {"email": user.email, "first_name": user.first_name}


def _respond(request, user, pair=None, remember=False, code=status.HTTP_200_OK):
    body = {"user": _user_payload(user) if user else None, "csrf": get_token(request)}
    response = Response(body, status=code)
    if pair:
        # Not remembered: a browser-session cookie, gone when the browser closes.
        max_age = int(REMEMBER_ME_LIFETIME.total_seconds()) if remember else None
        set_auth_cookies(response, pair["access"], pair["refresh"], max_age)
    return response


def _rotate(raw):
    """Spends a refresh token (blacklisting it) for a new pair with the same
    lifetime class. None when the token is missing, invalid or spent."""
    if not raw:
        return None
    try:
        token = RefreshToken(raw)
    except TokenError:
        return None
    user = User.objects.filter(id=token["user_id"], is_active=True).first()
    if user is None:
        return None
    remember = bool(token.get("remember", False))
    token.blacklist()
    return user, issue_token_pair(user, remember), remember


@api_view(["GET"])
@permission_classes([AllowAny])
def session(request):
    """Who is signed in, plus the CSRF token for writes. An expired access
    cookie with a live refresh cookie is renewed here, so a returning
    browser stays signed in without a failing request first."""
    if request.user.is_authenticated:
        return _respond(request, request.user)
    rotated = _rotate(request.COOKIES.get(REFRESH_COOKIE))
    if rotated:
        user, pair, remember = rotated
        return _respond(request, user, pair, remember)
    return _respond(request, None)


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([ScopedRateThrottle])
@scoped("auth-login")
def session_login(request):
    enforce_csrf(request)
    serializer = RememberMeTokenObtainPairSerializer(
        data=request.data, context={"request": request}
    )
    try:
        serializer.is_valid(raise_exception=True)
    except TokenError as error:
        raise AuthenticationFailed(str(error)) from error
    data = serializer.validated_data
    remember = RefreshToken(data["refresh"]).get("remember", False)
    return _respond(request, serializer.user, data, remember)


@api_view(["POST"])
@permission_classes([AllowAny])
def session_refresh(request):
    enforce_csrf(request)
    rotated = _rotate(request.COOKIES.get(REFRESH_COOKIE))
    if rotated is None:
        response = Response(
            {"detail": "Session expired."}, status=status.HTTP_401_UNAUTHORIZED
        )
        clear_auth_cookies(response)
        return response
    user, pair, remember = rotated
    return _respond(request, user, pair, remember)


@api_view(["POST"])
@permission_classes([AllowAny])
def session_logout(request):
    enforce_csrf(request)
    raw = request.COOKIES.get(REFRESH_COOKIE)
    if raw:
        try:
            RefreshToken(raw).blacklist()
        except TokenError:
            pass
    response = Response(status=status.HTTP_204_NO_CONTENT)
    clear_auth_cookies(response)
    return response
