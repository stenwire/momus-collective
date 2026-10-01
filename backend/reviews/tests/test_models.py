import uuid

import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction

from accounts.models import User
from catalog.models import Category, Product
from orders.models import Order
from orders.numbering import generate_order_number
from reviews.models import Review

pytestmark = pytest.mark.django_db


def make_user(email="buyer@example.com"):
    return User.objects.create_user(
        email=email,
        password="a-strong-password",
        first_name="Ada",
        phone="+2348000000000",
    )


def make_product():
    category = Category.objects.create(name="Tech", slug="tech")
    return Product.objects.create(
        category=category,
        slogan="404 slogan not found",
        slug="404-slogan",
        price=500000,
    )


def make_order(user):
    return Order.objects.create(
        order_number=generate_order_number(),
        user=user,
        shipping_address={"city": "Lagos"},
        subtotal=500000,
        total=500000,
    )


def test_review_pk_is_a_uuid():
    user = make_user()
    review = Review.objects.create(
        product=make_product(), user=user, order=make_order(user), rating=5
    )
    assert isinstance(review.id, uuid.UUID)


def test_rating_must_be_between_one_and_five():
    user = make_user()
    review = Review(product=make_product(), user=user, order=make_order(user), rating=6)
    with pytest.raises(ValidationError):
        review.full_clean()


def test_text_is_capped_at_500_characters():
    field = Review._meta.get_field("text")
    assert field.max_length == 500


def test_is_verified_defaults_true_set_from_order_relationship():
    """A Review always carries an order FK, so is_verified reflects a real
    purchase rather than user-supplied input."""
    user = make_user()
    review = Review.objects.create(
        product=make_product(), user=user, order=make_order(user), rating=4
    )
    assert review.is_verified is True


def test_is_visible_defaults_true():
    user = make_user()
    review = Review.objects.create(
        product=make_product(), user=user, order=make_order(user), rating=3
    )
    assert review.is_visible is True


def test_one_review_per_product_per_order():
    user = make_user()
    product = make_product()
    order = make_order(user)
    Review.objects.create(product=product, user=user, order=order, rating=5)
    with pytest.raises(IntegrityError), transaction.atomic():
        Review.objects.create(product=product, user=user, order=order, rating=1)
