import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient

from carts.models import CartItem, WishlistItem
from carts.tests.test_cart_api import client_for, make_user
from catalog.models import Category, Product

pytestmark = pytest.mark.django_db
URL = "/api/v1/wishlist/"


@pytest.fixture
def category():
    return Category.objects.create(name="Test Category", slug="test-category")


def make_product(category, n=1, **extra):
    return Product.objects.create(
        slogan=f"slogan {n}",
        slug=f"slogan-{n}",
        category=category,
        price=1000000 + n,
        shirt_colors=["Black", "White"],
        mockup_images=[f"https://example.com/{n}.png"],
        **extra,
    )


def heart(client, product):
    return client.post(URL, {"product": str(product.id)}, format="json")


def slugs(resp):
    return [entry["product"]["slug"] for entry in resp.json()]


def test_wishlist_authz_anonymous_is_401(category):
    product = make_product(category)
    client = APIClient()
    assert client.get(URL).status_code == 401
    assert heart(client, product).status_code == 401
    assert client.delete(f"{URL}{product.id}/").status_code == 401
    assert client.post(f"{URL}{product.id}/move-to-cart/").status_code == 401


def test_hearting_saves_once_and_lists_newest_first(category):
    first, second = make_product(category, 1), make_product(category, 2)
    client = client_for(make_user())
    assert heart(client, first).status_code == 201
    assert heart(client, second).status_code == 201
    resp = heart(client, first)
    assert slugs(resp) == ["slogan-2", "slogan-1"]
    assert WishlistItem.objects.count() == 2
    entry = client.get(URL).json()[1]["product"]
    assert entry == {
        "id": str(first.id),
        "slug": "slogan-1",
        "slogan": "slogan 1",
        "price": 1000001,
        "image": "https://example.com/1.png",
        "shirt_colors": ["Black", "White"],
        "available": True,
    }


def test_an_archived_product_cannot_be_hearted(category):
    product = make_product(category, is_active=False)
    client = client_for(make_user())
    assert heart(client, product).status_code == 404
    assert client.get(URL).json() == []


def test_removing_unhearts(category):
    product = make_product(category)
    client = client_for(make_user())
    heart(client, product)
    assert client.delete(f"{URL}{product.id}/").json() == []


def test_moving_to_the_bag_adds_a_line_and_leaves_the_wishlist(category):
    product = make_product(category)
    user = make_user()
    client = client_for(user)
    heart(client, product)
    resp = client.post(
        f"{URL}{product.id}/move-to-cart/", {"size": "L", "color": "White"}
    )
    assert resp.status_code == 200 and resp.json() == []
    line = CartItem.objects.get(cart__user=user)
    assert (line.product, line.size, line.color, line.quantity) == (
        product,
        "L",
        "White",
        1,
    )
    again = client.post(f"{URL}{product.id}/move-to-cart/", {"size": "L"})
    assert again.status_code == 404


@pytest.mark.parametrize("body", [{"size": "XXXL"}, {"size": "M", "color": "Neon"}, {}])
def test_a_refused_move_keeps_the_item_hearted(category, body):
    product = make_product(category)
    user = make_user()
    client = client_for(user)
    heart(client, product)
    assert client.post(f"{URL}{product.id}/move-to-cart/", body).status_code == 400
    assert slugs(client.get(URL)) == ["slogan-1"]
    assert not CartItem.objects.filter(cart__user=user).exists()


def test_an_archived_hearted_product_is_marked_and_cannot_move(category):
    product = make_product(category)
    client = client_for(make_user())
    heart(client, product)
    Product.objects.filter(id=product.id).update(is_active=False)
    [entry] = client.get(URL).json()
    assert entry["product"]["available"] is False
    resp = client.post(f"{URL}{product.id}/move-to-cart/", {"size": "M"})
    assert resp.status_code == 400
    assert "no longer available" in str(resp.json())
    assert len(client.get(URL).json()) == 1


def test_one_customers_wishlist_is_private(category):
    product = make_product(category)
    ada, bob = make_user("ada@example.com"), make_user("bob@example.com")
    heart(client_for(ada), product)
    bob_client = client_for(bob)
    assert bob_client.get(URL).json() == []
    assert (
        bob_client.post(f"{URL}{product.id}/move-to-cart/", {"size": "M"}).status_code
        == 404
    )
    bob_client.delete(f"{URL}{product.id}/")
    assert len(client_for(ada).get(URL).json()) == 1


def test_wishlist_num_queries_do_not_grow(category):
    client = client_for(make_user())
    heart(client, make_product(category, 1))
    with CaptureQueriesContext(connection) as one:
        client.get(URL)
    for n in range(2, 9):
        heart(client, make_product(category, n))
    with CaptureQueriesContext(connection) as many:
        assert len(client.get(URL).json()) == 8
    assert len(one) == len(many)
