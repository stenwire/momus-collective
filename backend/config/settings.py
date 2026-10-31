from datetime import timedelta
from pathlib import Path

import environ
from celery.schedules import crontab

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(
    DJANGO_DEBUG=(bool, False),
    DJANGO_ALLOWED_HOSTS=(list, []),
)

environ.Env.read_env(BASE_DIR / ".env")

# No fallback default: a missing key must fail loudly at import rather than
# silently running on a value an attacker can read from the repository.
SECRET_KEY = env("DJANGO_SECRET_KEY")

DEBUG = env("DJANGO_DEBUG")

ALLOWED_HOSTS = env("DJANGO_ALLOWED_HOSTS")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "accounts",
    "catalog",
    "carts",
    "orders",
    "promocodes",
    "reviews",
    "newsletter",
    "support",
    "designs",
    "notifications",
    "backups",
]

AUTH_USER_MODEL = "accounts.User"

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {"default": env.db("DATABASE_URL")}
# Reuse connections between requests instead of opening one per request;
# health checks drop a connection the database has closed (T-518).
DATABASES["default"]["CONN_MAX_AGE"] = env.int("DB_CONN_MAX_AGE", default=60)
DATABASES["default"]["CONN_HEALTH_CHECKS"] = True

REDIS_URL = env("REDIS_URL")

CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL
# Local runs without a worker: print files render inline.
CELERY_TASK_ALWAYS_EAGER = env.bool("CELERY_TASK_ALWAYS_EAGER", default=False)
# Keep the redacting LOGGING config in workers too (T-517).
CELERY_WORKER_HIJACK_ROOT_LOGGER = False
# Run by `celery -A config beat` alongside the worker.
CELERY_BEAT_SCHEDULE = {
    "review-prompts": {
        "task": "notifications.tasks.send_review_prompts",
        "schedule": 60 * 60,
    },
    # NFR-07, Lagos time (CELERY_TIMEZONE).
    "daily-database-backup": {
        "task": "backups.tasks.daily_database_backup",
        "schedule": crontab(hour=2, minute=0),
    },
    # FR-NOT-04, Fridays mid-morning Lagos time.
    "weekly-new-drops": {
        "task": "newsletter.tasks.weekly_new_drops",
        "schedule": crontab(hour=10, minute=0, day_of_week="friday"),
    },
    "weekly-asset-backup": {
        "task": "backups.tasks.weekly_asset_backup",
        "schedule": crontab(hour=3, minute=0, day_of_week="sunday"),
    },
}

CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": REDIS_URL,
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": (
            "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"
        )
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 8},
    },
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Africa/Lagos"
CELERY_TIMEZONE = TIME_ZONE
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedStaticFilesStorage"},
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    # Deny-by-default: an endpoint that forgets to declare permissions is
    # unreachable rather than open, matching the admin boundary (D-007).
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    # Bearer header first, then the browser's httpOnly cookie (D-080).
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "config.authentication.CookieJWTAuthentication",
    ],
    "DEFAULT_THROTTLE_CLASSES": ["rest_framework.throttling.ScopedRateThrottle"],
    "DEFAULT_THROTTLE_RATES": {
        # Per-IP, deliberately tight: these guard credential-stuffing and
        # account-enumeration surfaces, not general API traffic (D-047).
        "auth-login": "10/min",
        "auth-register": "5/min",
        "auth-password-reset": "5/min",
        "order-track": "30/min",
        "newsletter": "10/min",
        "complaints": "5/hour",
        "reviews": "60/min",
    },
}

SIMPLE_JWT = {
    # Remember Me controls refresh lifetime per-request (T-109); this is
    # the ceiling FR-USR-02 sets for a "remembered" session.
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=30),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
}

FRONTEND_URL = env("FRONTEND_URL", default="http://localhost:3000")

# Absolute links the backend hands out to itself, e.g. design-file downloads.
BACKEND_URL = env("BACKEND_URL", default="http://localhost:8000")

# Print files are private: outside any public media URL, served only through
# an access-checked endpoint (SEC-15).
DESIGN_FILES_ROOT = Path(
    env("DESIGN_FILES_ROOT", default=str(BASE_DIR / "private" / "design-files"))
)
BACKUP_ROOT = Path(env("BACKUP_ROOT", default=str(BASE_DIR / "private" / "backups")))

# D-097: each purpose picks a storage provider. The S3 settings are read
# only when a purpose uses S3, and then the keys are required (D-025).
STORAGE_PROVIDERS = {
    "design_files": env("FILE_STORAGE_PROVIDER", default="local"),
    "backups": env("BACKUP_STORAGE_PROVIDER", default="local"),
}
if "s3" in STORAGE_PROVIDERS.values():
    S3_ACCESS_KEY_ID = env("S3_ACCESS_KEY_ID")
    S3_SECRET_ACCESS_KEY = env("S3_SECRET_ACCESS_KEY")
    S3_ENDPOINT_URL = env("S3_ENDPOINT_URL", default="")
    S3_REGION = env("S3_REGION", default="auto")
    S3_BUCKETS = {
        "design_files": env("S3_FILES_BUCKET", default=""),
        "backups": env("S3_BACKUP_BUCKET", default=""),
    }

# The frontend is the only client (D-011); CORS is scoped to exactly the
# origins it can legitimately run on, not a wildcard.
CORS_ALLOWED_ORIGINS = [FRONTEND_URL, *env.list("CORS_EXTRA_ORIGINS", default=[])]
# Credentialed requests carry the auth cookies; still only these origins.
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS

# Browser auth lives in httpOnly cookies no script can read (D-080). The
# frontend and API must share a site (e.g. shop.example / api.shop.example)
# for SameSite=Lax cookies to flow; set AUTH_COOKIE_SAMESITE=None otherwise.
AUTH_COOKIE_SECURE = env.bool("AUTH_COOKIE_SECURE", default=True)
AUTH_COOKIE_SAMESITE = env("AUTH_COOKIE_SAMESITE", default="Lax")
AUTH_COOKIE_DOMAIN = env("AUTH_COOKIE_DOMAIN", default=None)
CSRF_COOKIE_SECURE = AUTH_COOKIE_SECURE
CSRF_COOKIE_SAMESITE = AUTH_COOKIE_SAMESITE

GOOGLE_OAUTH_CLIENT_ID = env("GOOGLE_OAUTH_CLIENT_ID")

# Required, no fallback (D-025). Empty disables payments rather than signing
# webhooks with a guessable key (FR-CART-06).
PAYSTACK_SECRET_KEY = env("PAYSTACK_SECRET_KEY")
PAYSTACK_PUBLIC_KEY = env("PAYSTACK_PUBLIC_KEY")

# WhatsApp (D-093). Keys are required with no fallback (D-025); empty
# means that provider sends nothing.
WHATSAPP_PROVIDER = env("WHATSAPP_PROVIDER", default="")
TERMII_API_KEY = env("TERMII_API_KEY")
TERMII_SENDER_ID = env("TERMII_SENDER_ID", default="")
TERMII_BASE_URL = env("TERMII_BASE_URL", default="https://api.ng.termii.com")
CALLMEBOT_API_KEY = env("CALLMEBOT_API_KEY")
ADMIN_WHATSAPP_NUMBER = env("ADMIN_WHATSAPP_NUMBER", default="")

DEFAULT_FROM_EMAIL = env(
    "DEFAULT_FROM_EMAIL", default="no-reply@momuscollective.example"
)

# Required, no fallback (D-025). Empty prints mail to the console instead
# of sending it, for local work.
RESEND_API_KEY = env("RESEND_API_KEY")
EMAIL_BACKEND = env(
    "EMAIL_BACKEND",
    default="config.email.ResendEmailBackend"
    if RESEND_API_KEY
    else "django.core.mail.backends.console.EmailBackend",
)

# T-517: one console handler, and it redacts PII and order tokens.
from config.logging import LOGGING  # noqa: E402,F401
