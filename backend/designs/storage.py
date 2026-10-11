from django.conf import settings
from django.core.files.storage import FileSystemStorage


def design_storage():
    # Read at call time so tests (and settings overrides) take effect.
    return FileSystemStorage(location=settings.DESIGN_FILES_ROOT)


def design_file_name(design_id):
    return f"{design_id}.png"


def discard_design_file(design_id):
    storage, name = design_storage(), design_file_name(design_id)
    if storage.exists(name):
        storage.delete(name)
