import uuid

import pytest
from django.db import IntegrityError, transaction

from accounts.models import User
from carts.models import Cart, CartItem, SavedDesign
from catalog.models import Category, Product

pytestmark = pytest.mark.django_db


def make_user(email="buyer@example.com"):
    return User.objects.create_user(
        email=email,
        password="a-strong-password",
        first_name="Ada",
        phone="+2348000000000",
    )


def make_product():
    # Distinct from the real launch categories T-203's migration seeds.
    category = Category.objects.create(name="Test Category", slug="test-category")
    return Product.objects.create(
        category=category,
        slogan="404 slogan not found",
        slug="404-slogan",
        price=500000,
    )


def make_saved_design(user):
    return SavedDesign.objects.create(
        user=user, name="My Design", config={"text": "hi"}
    )


def test_cart_pk_is_a_uuid():
    assert isinstance(Cart.objects.create(session_id="sess-1").id, uuid.UUID)


def test_guest_cart_is_keyed_by_session_id_not_user():
    cart = Cart.objects.create(session_id="sess-guest")
    assert cart.user is None
    assert cart.session_id == "sess-guest"


def test_logged_in_cart_has_a_user():
    user = make_user()
    cart = Cart.objects.create(user=user)
    assert cart.user == user


def test_cart_must_have_a_user_or_a_session():
    with pytest.raises(IntegrityError), transaction.atomic():
        Cart.objects.create()


def test_cart_item_for_a_catalog_product_has_no_saved_design():
    cart = Cart.objects.create(session_id="sess-1")
    item = CartItem.objects.create(
        cart=cart,
        product=make_product(),
        size="M",
        color="Black",
        quantity=1,
        unit_price=500000,
    )
    assert item.saved_design is None


def test_cart_item_for_a_custom_design_has_no_product():
    user = make_user()
    cart = Cart.objects.create(user=user)
    item = CartItem.objects.create(
        cart=cart,
        saved_design=make_saved_design(user),
        size="L",
        color="Navy",
        quantity=1,
        unit_price=650000,
    )
    assert item.product is None


def test_cart_item_cannot_have_both_product_and_saved_design():
    user = make_user()
    cart = Cart.objects.create(user=user)
    with pytest.raises(IntegrityError), transaction.atomic():
        CartItem.objects.create(
            cart=cart,
            product=make_product(),
            saved_design=make_saved_design(user),
            size="M",
            color="Black",
            quantity=1,
            unit_price=500000,
        )


def test_cart_item_cannot_have_neither_product_nor_saved_design():
    cart = Cart.objects.create(session_id="sess-1")
    with pytest.raises(IntegrityError), transaction.atomic():
        CartItem.objects.create(
            cart=cart, size="M", color="Black", quantity=1, unit_price=500000
        )


def test_unit_price_is_an_integer():
    cart = Cart.objects.create(session_id="sess-1")
    item = CartItem.objects.create(
        cart=cart,
        product=make_product(),
        size="M",
        color="Black",
        quantity=1,
        unit_price=500000,
    )
    assert isinstance(item.unit_price, int)
