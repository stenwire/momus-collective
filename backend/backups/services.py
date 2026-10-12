"""NFR-07: a daily database dump and a weekly archive of design and print
files, written to the backup storage (D-096, D-097) with old copies pruned.
The database host's own daily backups stay the primary (PRD: Supabase)."""

import gzip
import io
import tarfile

from django.core.files.base import ContentFile
from django.core.management import call_command
from django.utils import timezone

from config.storage import get_storage
from designs.storage import listdir

KEEP = {"database": 14, "assets": 8}
# Sessions, logs and caches are rebuilt or worthless after a restore.
EXCLUDE = ["contenttypes", "auth.permission", "sessions", "admin.logentry"]


def _stamp():
    return timezone.localtime().strftime("%Y%m%d-%H%M%S")


def _prune(storage, folder, keep):
    names = sorted(listdir(storage, folder)[1])
    stale = names[: max(len(names) - keep, 0)]
    for name in stale:
        storage.delete(f"{folder}/{name}")
    return stale


def backup_database():
    out = io.StringIO()
    call_command(
        "dumpdata",
        "--natural-foreign",
        "--natural-primary",
        *[f"--exclude={e}" for e in EXCLUDE],
        stdout=out,
    )
    storage = get_storage("backups")
    name = storage.save(
        f"database/database-{_stamp()}.json.gz",
        ContentFile(gzip.compress(out.getvalue().encode())),
    )
    _prune(storage, "database", KEEP["database"])
    return name


def _walk(storage, folder=""):
    dirs, files = listdir(storage, folder)
    for name in files:
        yield f"{folder}/{name}" if folder else name
    for d in dirs:
        yield from _walk(storage, f"{folder}/{d}" if folder else d)


def backup_assets():
    source, target = get_storage("design_files"), get_storage("backups")
    buffer, count = io.BytesIO(), 0
    with tarfile.open(fileobj=buffer, mode="w:gz") as archive:
        for name in _walk(source):
            with source.open(name, "rb") as f:
                data = f.read()
            info = tarfile.TarInfo(name=f"design-files/{name}")
            info.size = len(data)
            archive.addfile(info, io.BytesIO(data))
            count += 1
    name = target.save(
        f"assets/assets-{_stamp()}.tar.gz", ContentFile(buffer.getvalue())
    )
    _prune(target, "assets", KEEP["assets"])
    return name, count
