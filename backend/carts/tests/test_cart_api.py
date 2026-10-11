import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User
from carts.models import Cart, CartItem, SavedDesign
from catalog.models import Category, Product
from designs.pricing import price_list
from designs.tests.test_saved_designs import CONFIG

pytestmark = pytest.mark.django_db


def make_user(email="ada@example.com"):
    return User.objects.create_user(
        email=email, password="correct-horse-battery", first_name="A", phone="1"
    )


def client_for(user):
    client = APIClient()
    client.credentials(
        HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(user).access_token}"
    )
    return client


@pytest.fixture
def product():
    category = Category.objects.create(name="Test Category", slug="test-category")
    return Product.objects.create(
        slogan="touch grass",
        slug="touch-grass",
        category=category,
        price=1500000,
        shirt_colors=["Black", "White"],
        mockup_images=["https://example.com/m.png"],
    )


def add(client, **body):
    return client.post("/api/v1/cart/items/", body, format="json")


def test_anonymous_cart_access_is_401():
    assert APIClient().get("/api/v1/cart/").status_code == 401
    assert add(APIClient(), product="x", size="M").status_code == 401


def test_new_user_gets_an_empty_cart():
    body = client_for(make_user()).get("/api/v1/cart/").json()
    assert body == {"items": [], "item_count": 0, "subtotal": 0}


def test_add_a_product_line(product):
    client = client_for(make_user())
    resp = add(client, product=str(product.id), size="M", color="White", quantity=2)
    assert resp.status_code == 201
    body = resp.json()
    [line] = body["items"]
    assert line["kind"] == "product"
    assert line["product"]["slogan"] == "touch grass"
    assert line["product"]["image"] == "https://example.com/m.png"
    assert (line["size"], line["color"], line["quantity"]) == ("M", "White", 2)
    assert line["unit_price"] == 1500000
    assert body["subtotal"] == 3000000
    assert body["item_count"] == 2


def test_adding_the_same_line_again_adds_quantity(product):
    client = client_for(make_user())
    add(client, product=str(product.id), size="M", color="Black")
    body = add(client, product=str(product.id), size="M", color="Black", quantity=3)
    assert len(body.json()["items"]) == 1
    assert body.json()["items"][0]["quantity"] == 4


def test_a_different_size_is_a_different_line(product):
    client = client_for(make_user())
    add(client, product=str(product.id), size="M", color="Black")
    body = add(client, product=str(product.id), size="L", color="Black").json()
    assert len(body["items"]) == 2


def test_quantity_is_capped_at_ten_per_line(product):
    client = client_for(make_user())
    add(client, product=str(product.id), size="M", color="Black", quantity=8)
    body = add(client, product=str(product.id), size="M", color="Black", quantity=8)
    assert body.json()["items"][0]["quantity"] == 10


@pytest.mark.parametrize(
    "body,field",
    [
        ({"size": "XXXL", "color": "Black"}, "size"),
        ({"size": "M", "color": "Neon"}, "color"),
        ({"size": "M", "color": "Black", "quantity": 0}, "quantity"),
        ({"size": "M", "color": "Black", "quantity": 11}, "quantity"),
    ],
)
def test_invalid_lines_are_rejected(product, body, field):
    resp = add(client_for(make_user()), product=str(product.id), **body)
    assert resp.status_code == 400
    assert field in resp.json()


def test_an_archived_product_cannot_be_added(product):
    product.is_active = False
    product.save()
    resp = add(
        client_for(make_user()), product=str(product.id), size="M", color="Black"
    )
    assert resp.status_code == 400


def test_a_client_price_is_ignored(product):
    client = client_for(make_user())
    body = add(
        client, product=str(product.id), size="M", color="Black", unit_price=1
    ).json()
    assert body["items"][0]["unit_price"] == 1500000


def test_prices_follow_the_server_not_the_stored_line(product):
    client = client_for(make_user())
    add(client, product=str(product.id), size="M", color="Black")
    Product.objects.filter(id=product.id).update(price=1800000)
    assert client.get("/api/v1/cart/").json()["subtotal"] == 1800000


def test_add_a_saved_design_takes_its_shirt_colour_and_custom_price():
    user = make_user()
    design = SavedDesign.objects.create(user=user, name="mine", config=CONFIG)
    body = add(
        client_for(user), saved_design=str(design.id), size="L", color="White"
    ).json()
    [line] = body["items"]
    assert line["kind"] == "design"
    assert line["design"]["name"] == "mine"
    assert line["color"] == CONFIG["shirt_color"]
    assert line["unit_price"] == price_list()[CONFIG["shirt_color"]]


def test_someone_elses_design_cannot_be_added():
    owner, other = make_user(), make_user("other@example.com")
    design = SavedDesign.objects.create(user=owner, name="x", config=CONFIG)
    resp = add(client_for(other), saved_design=str(design.id), size="M")
    assert resp.status_code == 400


def test_product_and_design_together_are_rejected(product):
    user = make_user()
    design = SavedDesign.objects.create(user=user, name="x", config=CONFIG)
    resp = add(
        client_for(user),
        product=str(product.id),
        saved_design=str(design.id),
        size="M",
    )
    assert resp.status_code == 400


def test_change_quantity_and_remove(product):
    client = client_for(make_user())
    line_id = add(client, product=str(product.id), size="M", color="Black").json()[
        "items"
    ][0]["id"]
    body = client.patch(
        f"/api/v1/cart/items/{line_id}/", {"quantity": 3}, format="json"
    ).json()
    assert body["items"][0]["quantity"] == 3
    assert client.delete(f"/api/v1/cart/items/{line_id}/").json()["items"] == []


def test_another_users_line_cannot_be_touched(product):
    owner = client_for(make_user())
    line_id = add(owner, product=str(product.id), size="M", color="Black").json()[
        "items"
    ][0]["id"]
    intruder = client_for(make_user("intruder@example.com"))
    assert intruder.delete(f"/api/v1/cart/items/{line_id}/").status_code == 404
    assert CartItem.objects.filter(id=line_id).exists()


def test_the_cart_follows_the_user_across_devices(product):
    user = make_user()
    add(client_for(user), product=str(product.id), size="M", color="Black")
    second_device = client_for(user)
    assert len(second_device.get("/api/v1/cart/").json()["items"]) == 1
    assert Cart.objects.filter(user=user).count() == 1


def test_cart_query_count_is_constant(product):
    user = make_user()
    client = client_for(user)
    add(client, product=str(product.id), size="S", color="Black")
    with CaptureQueriesContext(connection) as one:
        client.get("/api/v1/cart/")
    for size in ["M", "L", "XL", "XXL"]:
        add(client, product=str(product.id), size=size, color="Black")
    for i in range(3):
        design = SavedDesign.objects.create(user=user, name=f"d{i}", config=CONFIG)
        add(client, saved_design=str(design.id), size="M")
    with CaptureQueriesContext(connection) as many:
        client.get("/api/v1/cart/")
    assert len(many) == len(one)
