import io

import boto3
import pytest
from django.core.exceptions import ImproperlyConfigured
from django.core.files.base import ContentFile
from django.core.files.storage import FileSystemStorage
from moto import mock_aws
from PIL import Image

from config.storage import get_storage
from designs.storage import design_storage, discard_design_files
from orders.tests.test_fulfilment import keys  # noqa: F401 (Paystack settings)

pytestmark = pytest.mark.django_db
BUCKET = "momus-files-test"


@pytest.fixture
def s3(settings):
    with mock_aws():
        boto3.client("s3", region_name="us-east-1").create_bucket(Bucket=BUCKET)
        settings.STORAGE_PROVIDERS = {"design_files": "s3", "backups": "local"}
        settings.S3_ACCESS_KEY_ID = "testing"
        settings.S3_SECRET_ACCESS_KEY = "testing"
        settings.S3_ENDPOINT_URL = ""
        settings.S3_REGION = "us-east-1"
        settings.S3_BUCKETS = {"design_files": BUCKET, "backups": ""}
        yield boto3.client("s3", region_name="us-east-1")


def test_local_disk_is_the_default_and_follows_settings(settings, tmp_path):
    settings.DESIGN_FILES_ROOT = tmp_path / "files"
    storage = design_storage()
    assert isinstance(storage, FileSystemStorage)
    storage.save("a/b.png", ContentFile(b"x"))
    assert (tmp_path / "files" / "a" / "b.png").read_bytes() == b"x"


def test_bad_configuration_is_refused(settings):
    settings.STORAGE_PROVIDERS = {"design_files": "dropbox", "backups": "local"}
    with pytest.raises(ImproperlyConfigured):
        get_storage("design_files")
    settings.STORAGE_PROVIDERS = {"design_files": "s3", "backups": "local"}
    settings.S3_BUCKETS = {"design_files": "", "backups": ""}
    with pytest.raises(ImproperlyConfigured):
        get_storage("design_files")
    with pytest.raises(ValueError):
        get_storage("photos")


def test_the_s3_provider_saves_reads_lists_and_deletes_privately(s3):
    storage = design_storage()
    name = storage.save("d1/print.png", ContentFile(b"png-bytes"))
    assert name == "d1/print.png" and storage.exists(name)
    with storage.open(name, "rb") as f:
        assert f.read() == b"png-bytes"
    assert storage.listdir("d1") == ([], ["print.png"])
    grants = s3.get_object_acl(Bucket=BUCKET, Key=name)["Grants"]
    assert all("AllUsers" not in str(g.get("Grantee", {})) for g in grants)
    discard_design_files("d1")
    assert not storage.exists(name)


def test_a_paid_custom_order_prints_to_the_bucket_and_staff_download_it(
    s3, monkeypatch, django_capture_on_commit_callbacks
):
    from accounts.models import User
    from carts.models import SavedDesign
    from carts.services import add_line, user_cart
    from designs.tests.test_saved_designs import CONFIG
    from orders.models import Order
    from orders.tests.test_fulfilment import client_for, pay, start

    user = User.objects.create_user(
        email="ada@example.com", password="x" * 12, phone="1"
    )
    design = SavedDesign.objects.create(user=user, name="mine", config=CONFIG)
    add_line(user_cart(user), saved_design=design, size="L", color="", quantity=1)
    body = start(client_for(user))
    with django_capture_on_commit_callbacks(execute=True):
        pay(monkeypatch, body)
    item = Order.objects.get(paystack_reference=body["reference"]).items.get()
    stored = {o["Key"] for o in s3.list_objects_v2(Bucket=BUCKET).get("Contents", [])}
    assert {f"orders/{item.id}.png", f"orders/{item.id}-preview.png"} <= stored
    staff = User.objects.create_user(
        email="o@example.com", password="x" * 12, phone="1", is_staff=True
    )
    resp = client_for(staff).get(f"/api/v1/orders/items/{item.id}/design-file/")
    assert resp.status_code == 200
    image = Image.open(io.BytesIO(b"".join(resp.streaming_content)))
    assert round(image.info["dpi"][0]) == 300
