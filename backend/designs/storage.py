import contextlib
import hashlib
import json
import os

from config.storage import get_storage


def design_storage():
    """Design and print files, on whichever provider D-097 selects."""
    return get_storage("design_files")


def listdir(storage, folder):
    """Object stores have no folders, so `exists(folder)` is always false
    there; list instead, and treat a missing local folder as empty."""
    try:
        return storage.listdir(folder)
    except FileNotFoundError:
        return [], []


def design_file_name(design_id, config):
    # Named by the config it renders: a stale render can never overwrite
    # the file of a newer config.
    digest = hashlib.sha256(json.dumps(config, sort_keys=True).encode()).hexdigest()
    return f"{design_id}/{digest[:16]}.png"


def discard_design_files(design_id):
    # One prefix per design, so this never scans other designs' files.
    storage, prefix = design_storage(), str(design_id)
    for name in listdir(storage, prefix)[1]:
        storage.delete(f"{prefix}/{name}")
    # Local disk keeps empty folders; object stores have none to remove.
    with contextlib.suppress(OSError, NotImplementedError):
        os.rmdir(storage.path(prefix))


def mockup_file_name(product_id):
    return f"mockups/{product_id}.png"


def order_item_file_name(item_id):
    return f"orders/{item_id}.png"


def order_item_preview_name(item_id):
    return f"orders/{item_id}-preview.png"
