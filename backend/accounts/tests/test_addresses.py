import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import Address, User

pytestmark = pytest.mark.django_db


def make_user(email="buyer@example.com"):
    return User.objects.create_user(
        email=email,
        password="correct-horse-battery",
        first_name="Ada",
        phone="+2348000000000",
    )


def auth_client(user):
    client = APIClient()
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return client


def address_payload(**overrides):
    payload = {
        "label": "Home",
        "full_name": "Ada Lovelace",
        "phone": "+2348000000000",
        "address_line_1": "1 Analytical Engine Way",
        "city": "Lagos",
        "state": "Lagos",
        "lga": "Ikeja",
        "is_default": False,
    }
    payload.update(overrides)
    return payload


def test_create_and_list_addresses_for_the_authenticated_user():
    user = make_user()
    client = auth_client(user)
    resp = client.post("/api/v1/addresses/", address_payload(), format="json")
    assert resp.status_code == 201

    listed = client.get("/api/v1/addresses/")
    assert listed.status_code == 200
    assert len(listed.data) == 1


def test_a_user_cannot_see_another_users_addresses():
    owner = make_user("owner@example.com")
    Address.objects.create(user=owner, **address_payload())

    other = make_user("other@example.com")
    resp = auth_client(other).get("/api/v1/addresses/")
    assert resp.status_code == 200
    assert resp.data == []


def test_anonymous_request_is_rejected():
    resp = APIClient().get("/api/v1/addresses/")
    assert resp.status_code == 401


def test_creating_a_second_default_unsets_the_first():
    user = make_user()
    client = auth_client(user)
    first = client.post(
        "/api/v1/addresses/", address_payload(is_default=True), format="json"
    )
    second = client.post(
        "/api/v1/addresses/",
        address_payload(label="Work", is_default=True),
        format="json",
    )
    assert second.status_code == 201

    first_address = Address.objects.get(id=first.data["id"])
    second_address = Address.objects.get(id=second.data["id"])
    assert first_address.is_default is False
    assert second_address.is_default is True


def test_set_default_action_promotes_an_existing_address():
    user = make_user()
    client = auth_client(user)
    first = client.post(
        "/api/v1/addresses/", address_payload(is_default=True), format="json"
    )
    second = client.post(
        "/api/v1/addresses/", address_payload(label="Work"), format="json"
    )

    resp = client.post(f"/api/v1/addresses/{second.data['id']}/set_default/")
    assert resp.status_code == 200

    first_address = Address.objects.get(id=first.data["id"])
    second_address = Address.objects.get(id=second.data["id"])
    assert first_address.is_default is False
    assert second_address.is_default is True


def test_update_and_delete_an_address():
    user = make_user()
    client = auth_client(user)
    created = client.post("/api/v1/addresses/", address_payload(), format="json")
    address_id = created.data["id"]

    updated = client.patch(
        f"/api/v1/addresses/{address_id}/", {"city": "Abuja"}, format="json"
    )
    assert updated.status_code == 200
    assert updated.data["city"] == "Abuja"

    deleted = client.delete(f"/api/v1/addresses/{address_id}/")
    assert deleted.status_code == 204
    assert not Address.objects.filter(id=address_id).exists()
