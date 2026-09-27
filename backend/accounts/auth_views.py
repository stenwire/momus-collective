from datetime import timedelta

from django.utils import timezone
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

# Remember Me unchecked: session-length only (browser close). Checked: the
# full 30 days FR-USR-02 names. Both are refresh-token lifetimes; the access
# token lifetime never changes.
REMEMBER_ME_LIFETIME = timedelta(days=30)
SESSION_ONLY_LIFETIME = timedelta(hours=12)


class RememberMeTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        # Form-encoded and query-string bodies send "false" as a truthy
        # string; only a real boolean or the literal string forms count.
        raw = self.context["request"].data.get("remember_me", False)
        remember_me = str(raw).strip().lower() in ("true", "1")
        lifetime = REMEMBER_ME_LIFETIME if remember_me else SESSION_ONLY_LIFETIME
        refresh = self.get_token(self.user)
        refresh.set_exp(from_time=timezone.now(), lifetime=lifetime)
        data["refresh"] = str(refresh)
        return data


class LoginView(TokenObtainPairView):
    serializer_class = RememberMeTokenObtainPairSerializer
