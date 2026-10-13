import pytest

from catalog.models import Category, Product


@pytest.fixture
def shirt():
    category = Category.objects.create(name="Test Category", slug="test-category")
    return Product.objects.create(
        slogan="touch grass", slug="tg", category=category, price=1
    )


@pytest.fixture
def other_shirt(shirt):
    return Product.objects.create(
        slogan="other", slug="other", category=shirt.category, price=1
    )
