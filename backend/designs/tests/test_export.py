import io

import pytest
from PIL import Image
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User
from carts.models import SavedDesign
from designs.storage import design_file_name, design_storage

from .test_saved_designs import CONFIG

pytestmark = pytest.mark.django_db


def make_user(email, **extra):
    return User.objects.create_user(
        email=email,
        password="correct-horse-battery",
        first_name="A",
        phone="1",
        **extra,
    )


def client_for(user):
    client = APIClient()
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return client


@pytest.fixture
def owner():
    return make_user("owner@example.com")


@pytest.fixture
def design(owner):
    return SavedDesign.objects.create(user=owner, name="x", config=CONFIG)


def stored_files(design):
    storage = design_storage()
    if not storage.exists(""):
        return []
    return [n for n in storage.listdir("")[1] if n.startswith(f"{design.id}-")]


def export(client, design):
    return client.post(f"/api/v1/designs/{design.id}/export/")


def test_export_generates_a_300_dpi_print_file(owner, design):
    resp = export(client_for(owner), design)
    assert resp.status_code == 202
    design.refresh_from_db()
    assert design.design_file_url == f"http://api.test/api/v1/designs/{design.id}/file/"

    download = client_for(owner).get(f"/api/v1/designs/{design.id}/file/")
    assert download.status_code == 200
    assert download["Content-Type"] == "image/png"
    image = Image.open(io.BytesIO(b"".join(download.streaming_content)))
    assert round(image.info["dpi"][0]) >= 300
    assert image.size == (3300, 2400)


def test_export_is_owner_only(design):
    intruder = make_user("intruder@example.com")
    assert export(client_for(intruder), design).status_code == 404
    assert export(APIClient(), design).status_code == 401
    assert not stored_files(design)


def test_print_file_is_not_downloadable_by_other_customers(owner, design):
    export(client_for(owner), design)
    url = f"/api/v1/designs/{design.id}/file/"
    assert client_for(make_user("other@example.com")).get(url).status_code == 404
    assert APIClient().get(url).status_code == 401


def test_staff_can_download_any_print_file(owner, design):
    export(client_for(owner), design)
    admin = make_user("admin@example.com", is_staff=True)
    resp = client_for(admin).get(f"/api/v1/designs/{design.id}/file/")
    assert resp.status_code == 200


def test_file_404s_before_any_export(owner, design):
    assert (
        client_for(owner).get(f"/api/v1/designs/{design.id}/file/").status_code == 404
    )


def test_changing_the_config_discards_the_stale_print_file(owner, design):
    client = client_for(owner)
    export(client, design)
    client.patch(
        f"/api/v1/designs/{design.id}/",
        {"config": {**CONFIG, "text": "changed"}},
        format="json",
    )
    design.refresh_from_db()
    assert design.design_file_url == ""
    assert not stored_files(design)


def test_renaming_keeps_the_print_file(owner, design):
    client = client_for(owner)
    export(client, design)
    client.patch(f"/api/v1/designs/{design.id}/", {"name": "new"}, format="json")
    design.refresh_from_db()
    assert design.design_file_url != ""


def test_deleting_a_design_deletes_its_print_file(owner, design):
    client = client_for(owner)
    export(client, design)
    client.delete(f"/api/v1/designs/{design.id}/")
    assert not stored_files(design)


def test_a_design_deleted_before_the_task_runs_is_skipped(design):
    from designs.tasks import generate_design_file

    design_id = str(design.id)
    design.delete()
    generate_design_file(design_id)  # must not raise
    storage = design_storage()
    assert not storage.exists("") or storage.listdir("")[1] == []


def test_an_edit_during_render_never_publishes_the_stale_file(
    owner, design, monkeypatch
):
    from designs import tasks

    real_render = tasks.render_design_png

    def render_then_edit(config):
        png = real_render(config)
        SavedDesign.objects.filter(id=design.id).update(
            config={**config, "text": "edited mid-render"}
        )
        return png

    monkeypatch.setattr(tasks, "render_design_png", render_then_edit)
    export(client_for(owner), design)
    design.refresh_from_db()
    assert design.design_file_url == ""
    assert stored_files(design) == []


def test_each_config_gets_its_own_file_name(design):
    # A late render of an old config therefore can't overwrite a newer file.
    newer = {**CONFIG, "text": "newer"}
    reordered = dict(reversed(list(CONFIG.items())))
    assert design_file_name(design.id, CONFIG) != design_file_name(design.id, newer)
    assert design_file_name(design.id, CONFIG) == design_file_name(design.id, reordered)


def test_re_export_after_an_edit_serves_the_new_config(owner, design):
    client = client_for(owner)
    export(client, design)
    client.patch(
        f"/api/v1/designs/{design.id}/",
        {"config": {**CONFIG, "text": "second"}},
        format="json",
    )
    export(client, design)
    assert len(stored_files(design)) == 1
    resp = client.get(f"/api/v1/designs/{design.id}/file/")
    assert resp.status_code == 200
