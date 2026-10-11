import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User
from carts.models import SavedDesign

pytestmark = pytest.mark.django_db

CONFIG = {
    "shirt_color": "Black",
    "text": "touch grass",
    "font": "anton",
    "font_size": "large",
    "text_color": "Gold",
    "alignment": "center",
    "letter_spacing": "wide",
    "placement": "center_chest",
}


def make_user(email="ada@example.com"):
    return User.objects.create_user(
        email=email, password="correct-horse-battery", first_name="Ada", phone="1"
    )


def client_for(user):
    client = APIClient()
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return client


def save(client, **overrides):
    body = {"name": "My shirt", "config": {**CONFIG, **overrides}}
    return client.post("/api/v1/designs/", body, format="json")


def test_saves_the_full_config_to_the_requesters_account():
    user = make_user()
    resp = save(client_for(user))
    assert resp.status_code == 201
    design = SavedDesign.objects.get(id=resp.json()["id"])
    assert design.user == user
    assert design.config == CONFIG
    assert design.name == "My shirt"


def test_anonymous_save_is_rejected():
    assert save(APIClient()).status_code == 401


def test_owner_is_taken_from_the_token_not_the_body():
    user, other = make_user(), make_user("other@example.com")
    body = {"name": "x", "config": CONFIG, "user": str(other.id)}
    resp = client_for(user).post("/api/v1/designs/", body, format="json")
    assert SavedDesign.objects.get(id=resp.json()["id"]).user == user


def test_lists_only_the_requesters_designs():
    user, other = make_user(), make_user("other@example.com")
    save(client_for(user))
    save(client_for(other))
    resp = client_for(user).get("/api/v1/designs/")
    assert resp.status_code == 200
    assert len(resp.json()) == 1


def test_another_users_design_is_invisible():
    owner, intruder = make_user(), make_user("intruder@example.com")
    design_id = save(client_for(owner)).json()["id"]
    client = client_for(intruder)
    assert client.get(f"/api/v1/designs/{design_id}/").status_code == 404
    assert (
        client.patch(
            f"/api/v1/designs/{design_id}/", {"name": "mine"}, format="json"
        ).status_code
        == 404
    )
    assert client.delete(f"/api/v1/designs/{design_id}/").status_code == 404
    assert SavedDesign.objects.get(id=design_id).name == "My shirt"


def test_owner_can_update_and_delete():
    client = client_for(make_user())
    design_id = save(client).json()["id"]
    resp = client.patch(
        f"/api/v1/designs/{design_id}/",
        {"config": {**CONFIG, "text": "new words"}},
        format="json",
    )
    assert resp.status_code == 200
    assert SavedDesign.objects.get(id=design_id).config["text"] == "new words"
    assert client.delete(f"/api/v1/designs/{design_id}/").status_code == 204
    assert not SavedDesign.objects.filter(id=design_id).exists()


@pytest.mark.parametrize(
    "overrides,field",
    [
        ({"font": "comic_sans"}, "font"),
        ({"shirt_color": "Neon"}, "shirt_color"),
        ({"placement": "back"}, "placement"),
        ({"font_size": "huge"}, "font_size"),
        ({"text": "x" * 81}, "text"),
        ({"text": "   "}, "text"),
        ({"text_color": "Ink Black"}, "text_color"),
    ],
)
def test_invalid_config_is_rejected(overrides, field):
    resp = save(client_for(make_user()), **overrides)
    assert resp.status_code == 400
    assert field in resp.json()["config"]


def test_unknown_and_missing_config_keys_are_rejected():
    client = client_for(make_user())
    extra = {"name": "x", "config": {**CONFIG, "script": "<script>"}}
    assert client.post("/api/v1/designs/", extra, format="json").status_code == 400
    partial = {k: v for k, v in CONFIG.items() if k != "font"}
    missing = {"name": "x", "config": partial}
    assert client.post("/api/v1/designs/", missing, format="json").status_code == 400


def test_text_and_name_are_sanitized_on_save():
    resp = save(client_for(make_user()), text="zero​width\u0007")
    assert resp.json()["config"]["text"] == "zerowidth"
    resp = client_for(make_user("b@example.com")).post(
        "/api/v1/designs/",
        {"name": "line\none‮", "config": CONFIG},
        format="json",
    )
    assert resp.json()["name"] == "line one"


def test_list_query_count_is_constant():
    user = make_user()
    client = client_for(user)
    save(client)
    with CaptureQueriesContext(connection) as one:
        client.get("/api/v1/designs/")
    for _ in range(10):
        save(client)
    with CaptureQueriesContext(connection) as many:
        client.get("/api/v1/designs/")
    assert len(many) == len(one)


def test_options_route_is_not_swallowed_by_the_design_router():
    assert APIClient().get("/api/v1/designs/options/").status_code == 200
