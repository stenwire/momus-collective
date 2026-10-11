from django.conf import settings
from rest_framework.authentication import CSRFCheck
from rest_framework.exceptions import PermissionDenied
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

ACCESS_COOKIE = "momus_access"
REFRESH_COOKIE = "momus_refresh"
# The refresh cookie only ever travels to the endpoints that spend it.
REFRESH_COOKIE_PATH = "/api/v1/auth/session/"


def enforce_csrf(request):
    """Cookies ride along on cross-site requests, so any write that relies
    on them must also prove it came from our page (NFR-04)."""
    check = CSRFCheck(lambda _request: None)
    check.process_request(request)
    reason = check.process_view(request, None, (), {})
    if reason:
        raise PermissionDenied(f"CSRF failed: {reason}")


class CookieJWTAuthentication(JWTAuthentication):
    """A Bearer header (API clients, tests) wins. Otherwise the httpOnly
    access cookie, with CSRF enforced. A stale cookie is anonymous, not an
    error, so public endpoints keep working for a logged-out browser."""

    def authenticate(self, request):
        if self.get_header(request) is not None:
            return super().authenticate(request)
        raw = request.COOKIES.get(ACCESS_COOKIE)
        if not raw:
            return None
        try:
            token = self.get_validated_token(raw)
        except (InvalidToken, TokenError):
            return None
        enforce_csrf(request)
        return self.get_user(token), token


def set_auth_cookies(response, access, refresh, refresh_max_age):
    common = {
        "httponly": True,
        "secure": settings.AUTH_COOKIE_SECURE,
        "samesite": settings.AUTH_COOKIE_SAMESITE,
        "domain": settings.AUTH_COOKIE_DOMAIN,
    }
    access_age = int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds())
    response.set_cookie(ACCESS_COOKIE, access, max_age=access_age, path="/", **common)
    response.set_cookie(
        REFRESH_COOKIE,
        refresh,
        max_age=refresh_max_age,
        path=REFRESH_COOKIE_PATH,
        **common,
    )


def clear_auth_cookies(response):
    domain = settings.AUTH_COOKIE_DOMAIN
    response.delete_cookie(ACCESS_COOKIE, path="/", domain=domain)
    response.delete_cookie(REFRESH_COOKIE, path=REFRESH_COOKIE_PATH, domain=domain)
