import re
from pathlib import Path

from django.conf import settings

SETTINGS_SRC = (Path(settings.BASE_DIR) / "config" / "settings.py").read_text(
    encoding="utf-8"
)


def test_secret_key_is_read_from_env_with_no_fallback():
    """SEC-11: `env("DJANGO_SECRET_KEY")` with a default would silently ship one."""
    assert re.search(r'SECRET_KEY = env\("DJANGO_SECRET_KEY"\)', SETTINGS_SRC)
    assert "django-insecure" not in SETTINGS_SRC


def test_debug_is_false_unless_environment_opts_in():
    """SEC-12: the declared default is what a deployment gets when unset."""
    assert "DJANGO_DEBUG=(bool, False)" in SETTINGS_SRC


def test_allowed_hosts_is_not_wildcard():
    assert settings.ALLOWED_HOSTS != ["*"]


def test_password_minimum_length_is_eight():
    by_name = {
        v["NAME"].rsplit(".", 1)[-1]: v for v in settings.AUTH_PASSWORD_VALIDATORS
    }
    assert by_name["MinimumLengthValidator"]["OPTIONS"]["min_length"] == 8


def test_timezone_is_lagos_and_aware():
    assert settings.TIME_ZONE == "Africa/Lagos"
    assert settings.USE_TZ is True


def test_rest_framework_is_installed():
    assert "rest_framework" in settings.INSTALLED_APPS
