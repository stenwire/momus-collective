import hashlib
import json

from django.conf import settings
from django.core.files.storage import FileSystemStorage


def design_storage():
    # Read at call time so tests (and settings overrides) take effect.
    return FileSystemStorage(location=settings.DESIGN_FILES_ROOT)


def design_file_name(design_id, config):
    # Named by the config it renders: a stale render can never overwrite
    # the file of a newer config.
    digest = hashlib.sha256(json.dumps(config, sort_keys=True).encode()).hexdigest()
    return f"{design_id}-{digest[:16]}.png"


def discard_design_files(design_id):
    storage = design_storage()
    if not storage.exists(""):
        return
    for name in storage.listdir("")[1]:
        if name.startswith(f"{design_id}-"):
            storage.delete(name)
