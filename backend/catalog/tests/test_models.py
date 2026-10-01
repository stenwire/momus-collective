import uuid
from decimal import Decimal

import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.db.models import ProtectedError

from catalog.models import Category, Collection, CollectionProduct, Product

pytestmark = pytest.mark.django_db


def make_category(**kwargs):
    kwargs.setdefault("name", "Philosophy")
    kwargs.setdefault("slug", "philosophy")
    return Category.objects.create(**kwargs)


def make_product(category=None, **kwargs):
    category = category or make_category()
    kwargs.setdefault("slogan", "cogito ergo sold out")
    kwargs.setdefault("slug", "cogito-ergo-sold-out")
    kwargs.setdefault("price", 500000)
    return Product.objects.create(category=category, **kwargs)


def test_product_pk_is_a_uuid():
    assert isinstance(make_product().id, uuid.UUID)


def test_price_is_stored_as_integer_minor_units_not_float():
    product = make_product(price=1250000)
    field = Product._meta.get_field("price")
    assert field.get_internal_type() == "PositiveIntegerField"
    assert isinstance(product.price, int)


def test_avg_rating_is_decimal_not_float():
    product = make_product()
    product.refresh_from_db()
    field = Product._meta.get_field("avg_rating")
    assert field.get_internal_type() == "DecimalField"
    assert isinstance(product.avg_rating, Decimal)


def test_price_must_be_positive():
    with pytest.raises(ValidationError):
        p = make_product(price=0, slug="free-shirt")
        p.full_clean()


def test_category_slug_is_unique():
    make_category(slug="tech")
    with pytest.raises(IntegrityError), transaction.atomic():
        make_category(name="Tech Again", slug="tech")


def test_product_category_is_protected_on_delete():
    category = make_category()
    make_product(category=category)
    with pytest.raises(ProtectedError):
        category.delete()


def test_collection_holds_products_through_collectionproduct():
    collection = Collection.objects.create(name="New Drops", slug="new-drops")
    product = make_product()
    CollectionProduct.objects.create(collection=collection, product=product)
    assert product in collection.products.all()
    assert collection in product.collections.all()


def test_product_can_belong_to_multiple_collections():
    product = make_product()
    c1 = Collection.objects.create(name="New Drops", slug="new-drops")
    c2 = Collection.objects.create(name="Bestsellers", slug="bestsellers")
    CollectionProduct.objects.create(collection=c1, product=product)
    CollectionProduct.objects.create(collection=c2, product=product)
    assert product.collections.count() == 2


def test_a_product_cannot_be_added_twice_to_the_same_collection():
    collection = Collection.objects.create(name="New Drops", slug="new-drops")
    product = make_product()
    CollectionProduct.objects.create(collection=collection, product=product)
    with pytest.raises(IntegrityError), transaction.atomic():
        CollectionProduct.objects.create(collection=collection, product=product)


def test_is_custom_defaults_false_for_catalog_products():
    assert make_product().is_custom is False
