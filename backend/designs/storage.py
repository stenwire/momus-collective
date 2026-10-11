import contextlib
import hashlib
import json
import os

from django.conf import settings
from django.core.files.storage import FileSystemStorage


def design_storage():
    # Read at call time so tests (and settings overrides) take effect.
    return FileSystemStorage(location=settings.DESIGN_FILES_ROOT)


def design_file_name(design_id, config):
    # Named by the config it renders: a stale render can never overwrite
    # the file of a newer config.
    digest = hashlib.sha256(json.dumps(config, sort_keys=True).encode()).hexdigest()
    return f"{design_id}/{digest[:16]}.png"


def discard_design_files(design_id):
    # One prefix per design, so this never scans other designs' files.
    storage, prefix = design_storage(), str(design_id)
    if storage.exists(prefix):
        for name in storage.listdir(prefix)[1]:
            storage.delete(f"{prefix}/{name}")
        # Local disk keeps empty folders; object stores have none to remove.
        with contextlib.suppress(OSError, NotImplementedError):
            os.rmdir(storage.path(prefix))


def order_item_file_name(item_id):
    return f"orders/{item_id}.png"
