"""File storage behind one interface (D-097): each purpose picks a provider
by environment variable, `local` disk or an `s3`-compatible bucket
(Cloudflare R2, S3, Backblaze). Callers always get a Django Storage."""

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.core.files.storage import FileSystemStorage

PURPOSES = ("design_files", "backups")
# Read at call time, so tests and settings overrides take effect.
LOCAL_ROOTS = {"design_files": "DESIGN_FILES_ROOT", "backups": "BACKUP_ROOT"}


class Provider:
    name = ""

    def build(self, purpose):
        raise NotImplementedError


class Local(Provider):
    name = "local"

    def build(self, purpose):
        return FileSystemStorage(location=getattr(settings, LOCAL_ROOTS[purpose]))


class S3Compatible(Provider):
    """Private objects; downloads go through our own staff-checked views."""

    name = "s3"

    def build(self, purpose):
        from storages.backends.s3 import S3Storage

        bucket = getattr(settings, "S3_BUCKETS", {}).get(purpose)
        if not bucket:
            raise ImproperlyConfigured(f"No S3 bucket is set for {purpose}.")
        return S3Storage(
            bucket_name=bucket,
            endpoint_url=settings.S3_ENDPOINT_URL or None,
            region_name=settings.S3_REGION or None,
            access_key=settings.S3_ACCESS_KEY_ID,
            secret_key=settings.S3_SECRET_ACCESS_KEY,
            default_acl=None,
            querystring_auth=True,
            file_overwrite=True,
        )


PROVIDERS = {cls.name: cls for cls in (Local, S3Compatible)}


def get_storage(purpose):
    if purpose not in PURPOSES:
        raise ValueError(f"Unknown storage purpose {purpose!r}.")
    name = settings.STORAGE_PROVIDERS[purpose]
    if name not in PROVIDERS:
        raise ImproperlyConfigured(
            f"Storage provider for {purpose} must be one of {', '.join(PROVIDERS)}."
        )
    return PROVIDERS[name]().build(purpose)
