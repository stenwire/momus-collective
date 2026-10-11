import pytest

from accounts.models import User
from catalog.models import Category, Product


@pytest.fixture
def product():
    category = Category.objects.create(name="Test Category", slug="test-category")
    return Product.objects.create(
        slogan="touch grass", slug="tg", category=category, price=1000000
    )


@pytest.fixture
def user():
    return User.objects.create_user(
        email="ada@example.com",
        password="correct-horse-battery",
        first_name="A",
        phone="1",
    )
