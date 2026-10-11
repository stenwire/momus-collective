import uuid

import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User
from carts.models import SavedDesign
from carts.services import add_line, user_cart
from catalog.models import Category, Product
from designs.pricing import price_list
from designs.tests.test_saved_designs import CONFIG

pytestmark = pytest.mark.django_db
URL = "/api/v1/checkout/quote/"


@pytest.fixture
def products():
    category = Category.objects.create(name="Test Category", slug="test-category")
    a = Product.objects.create(
        slogan="touch grass",
        slug="tg",
        category=category,
        price=1500000,
        shirt_colors=["Black", "White"],
    )
    b = Product.objects.create(
        slogan="naps good", slug="ng", category=category, price=1200000
    )
    return a, b


def user_client(user):
    client = APIClient()
    client.credentials(
        HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(user).access_token}"
    )
    return client


def make_user():
    return User.objects.create_user(
        email="ada@example.com",
        password="correct-horse-battery",
        first_name="A",
        phone="1",
    )


def line(product, size="M", color="Black", quantity=1, **extra):
    return {
        "product": str(product.id),
        "size": size,
        "color": color,
        "quantity": quantity,
        **extra,
    }


def test_guest_quote_prices_every_line_from_the_server(products):
    a, b = products
    body = (
        APIClient()
        .post(
            URL,
            {"items": [line(a, quantity=2), line(b, color="", quantity=1)]},
            format="json",
        )
        .json()
    )
    assert body["subtotal"] == 2 * 1500000 + 1200000
    assert body["total"] == body["subtotal"]
    assert [entry["unit_price"] for entry in body["lines"]] == [1500000, 1200000]


def test_client_supplied_prices_and_totals_are_ignored(products):
    a, _ = products
    tampered = line(a, quantity=2, unit_price=1, price=1, line_total=2)
    body = (
        APIClient()
        .post(
            URL,
            {"items": [tampered], "subtotal": 2, "total": 2, "discount": 3000000},
            format="json",
        )
        .json()
    )
    assert body["lines"][0]["unit_price"] == 1500000
    assert body["total"] == 3000000
    assert body["discount"] == 0


def test_a_signed_in_customer_pays_for_their_server_cart_not_the_body(products):
    a, b = products
    user = make_user()
    add_line(user_cart(user), product=a, size="M", color="Black", quantity=1)
    body = (
        user_client(user)
        .post(URL, {"items": [line(b, color="", quantity=10)]}, format="json")
        .json()
    )
    assert [entry["title"] for entry in body["lines"]] == ["touch grass"]
    assert body["total"] == 1500000


def test_a_saved_design_is_priced_by_custom_pricing(products):
    user = make_user()
    design = SavedDesign.objects.create(user=user, name="mine", config=CONFIG)
    add_line(user_cart(user), saved_design=design, size="L", color="", quantity=2)
    body = user_client(user).post(URL, {}, format="json").json()
    expected = price_list()[CONFIG["shirt_color"]]
    assert body["lines"][0]["title"] == "Custom Design"
    assert body["total"] == expected * 2


def test_a_price_change_is_what_gets_charged(products):
    a, _ = products
    Product.objects.filter(id=a.id).update(price=1800000)
    body = APIClient().post(URL, {"items": [line(a)]}, format="json").json()
    assert body["total"] == 1800000


def test_an_archived_product_is_refused_for_guests_and_customers(products):
    a, _ = products
    user = make_user()
    add_line(user_cart(user), product=a, size="M", color="Black", quantity=1)
    Product.objects.filter(id=a.id).update(is_active=False)
    guest = APIClient().post(URL, {"items": [line(a)]}, format="json")
    assert guest.status_code == 400
    assert "no longer available" in str(guest.json())
    assert user_client(user).post(URL, {}, format="json").status_code == 400


def test_unknown_products_bad_sizes_and_colours_are_refused(products):
    a, _ = products
    for bad in [
        {"items": [{**line(a), "product": str(uuid.uuid4())}]},
        {"items": [line(a, size="XXXL")]},
        {"items": [line(a, color="Neon")]},
        {"items": [line(a, quantity=11)]},
    ]:
        assert APIClient().post(URL, bad, format="json").status_code == 400


def test_an_empty_bag_cannot_be_quoted():
    resp = APIClient().post(URL, {"items": []}, format="json")
    assert resp.status_code == 400
    assert "empty" in str(resp.json())
