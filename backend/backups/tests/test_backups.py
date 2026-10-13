import gzip
import io
import json
import tarfile

import boto3
import pytest
from celery.schedules import crontab
from django.conf import settings as django_settings
from django.core.files.base import ContentFile
from django.core.management import call_command
from moto import mock_aws

from backups import services
from config.storage import get_storage
from designs.storage import design_storage
from orders.models import Order
from orders.tests.test_admin_board import make

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def roots(settings, tmp_path):
    settings.DESIGN_FILES_ROOT = tmp_path / "files"
    settings.BACKUP_ROOT = tmp_path / "backups"


def test_the_database_dump_restores_a_deleted_order(tmp_path):
    from accounts.models import User
    from catalog.models import Category, Product

    category = Category.objects.create(name="Test Category", slug="test-category")
    product = Product.objects.create(slogan="s", slug="s", category=category, price=1)
    User.objects.create_user(email="ada@example.com", password="x" * 12, phone="1")
    order = make(1, product=product)
    name = services.backup_database()
    assert name.startswith("database/database-") and name.endswith(".json.gz")
    with get_storage("backups").open(name, "rb") as f:
        dump = gzip.decompress(f.read())
    models = {row["model"] for row in json.loads(dump)}
    assert {"orders.order", "catalog.product", "accounts.user"} <= models
    assert not models & {"sessions.session", "contenttypes.contenttype"}
    Order.objects.filter(pk=order.pk).delete()
    restore = tmp_path / "restore.json"
    restore.write_bytes(dump)
    call_command("loaddata", str(restore), verbosity=0)
    assert Order.objects.get(pk=order.pk).order_number == order.order_number


def test_the_asset_archive_holds_every_design_and_print_file():
    files = design_storage()
    files.save("d1/aaaa.png", ContentFile(b"one"))
    files.save("orders/item-1.png", ContentFile(b"two"))
    files.save("orders/item-1-preview.png", ContentFile(b"three"))
    name, count = services.backup_assets()
    assert count == 3 and name.startswith("assets/assets-")
    with get_storage("backups").open(name, "rb") as f:
        archive = tarfile.open(fileobj=io.BytesIO(f.read()), mode="r:gz")
    contents = {m.name: archive.extractfile(m).read() for m in archive.getmembers()}
    assert contents == {
        "design-files/d1/aaaa.png": b"one",
        "design-files/orders/item-1.png": b"two",
        "design-files/orders/item-1-preview.png": b"three",
    }


def test_an_empty_store_still_backs_up():
    name, count = services.backup_assets()
    assert count == 0 and get_storage("backups").exists(name)


def test_old_copies_are_pruned(monkeypatch):
    stamps = iter(f"20261001-0000{n:02d}" for n in range(30))
    monkeypatch.setattr(services, "_stamp", lambda: next(stamps))
    for _ in range(16):
        services.backup_database()
    for _ in range(10):
        services.backup_assets()
    storage = get_storage("backups")
    dumps = sorted(storage.listdir("database")[1])
    archives = sorted(storage.listdir("assets")[1])
    assert len(dumps) == 14 and dumps[0] == "database-20261001-000002.json.gz"
    assert len(archives) == 8 and archives[-1] == "assets-20261001-000025.tar.gz"


def test_backups_go_to_an_s3_bucket(settings):
    with mock_aws():
        boto3.client("s3", region_name="us-east-1").create_bucket(
            Bucket="momus-backups"
        )
        settings.STORAGE_PROVIDERS = {"design_files": "local", "backups": "s3"}
        settings.S3_ACCESS_KEY_ID = settings.S3_SECRET_ACCESS_KEY = "testing"
        settings.S3_ENDPOINT_URL = ""
        settings.S3_REGION = "us-east-1"
        settings.S3_BUCKETS = {"design_files": "", "backups": "momus-backups"}
        services.backup_database()
        services.backup_assets()
        keys = [
            o["Key"]
            for o in boto3.client("s3", region_name="us-east-1").list_objects_v2(
                Bucket="momus-backups"
            )["Contents"]
        ]
        assert any(k.startswith("database/") for k in keys)
        assert any(k.startswith("assets/") for k in keys)


def test_the_schedule_is_daily_database_and_weekly_assets_in_lagos_time():
    schedule = django_settings.CELERY_BEAT_SCHEDULE
    daily = schedule["daily-database-backup"]
    weekly = schedule["weekly-asset-backup"]
    assert daily["task"] == "backups.tasks.daily_database_backup"
    assert daily["schedule"] == crontab(hour=2, minute=0)
    assert weekly["task"] == "backups.tasks.weekly_asset_backup"
    assert weekly["schedule"] == crontab(hour=3, minute=0, day_of_week="sunday")
    assert django_settings.CELERY_TIMEZONE == "Africa/Lagos"


def test_backup_now_runs_both():
    out = io.StringIO()
    call_command("backup_now", stdout=out)
    text = out.getvalue()
    assert "database -> database/" in text and "assets (0 files) -> assets/" in text
