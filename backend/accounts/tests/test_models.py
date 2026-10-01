import uuid

import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction

from accounts.models import Address

User = get_user_model()

pytestmark = pytest.mark.django_db


def make_user(email="buyer@example.com", **kwargs):
    return User.objects.create_user(
        email=email,
        password="a-strong-password",
        first_name="Ada",
        phone="+2348000000000",
        **kwargs,
    )


def test_user_pk_is_a_uuid():
    user = make_user()
    assert isinstance(user.id, uuid.UUID)


def test_user_email_is_the_username_field():
    assert User.USERNAME_FIELD == "email"
    user = make_user()
    assert user.get_username() == "buyer@example.com"


def test_duplicate_email_is_rejected_at_the_database():
    make_user()
    with pytest.raises(IntegrityError), transaction.atomic():
        make_user()


def test_password_is_hashed_not_stored_plain():
    user = make_user()
    assert user.password != "a-strong-password"
    assert user.check_password("a-strong-password")


def test_notification_pref_defaults_to_email():
    user = make_user()
    assert user.notification_pref == "email"


def test_auth_provider_defaults_to_email():
    user = make_user()
    assert user.auth_provider == "email"


def test_address_pk_is_a_uuid_and_links_to_user():
    user = make_user()
    addr = Address.objects.create(
        user=user,
        label="Home",
        full_name="Ada Lovelace",
        phone="+2348000000000",
        address_line_1="1 Marina Rd",
        city="Lagos",
        state="Lagos",
        lga="Eti-Osa",
    )
    assert isinstance(addr.id, uuid.UUID)
    assert addr in user.addresses.all()


def test_user_can_have_multiple_addresses():
    user = make_user()
    Address.objects.create(
        user=user,
        label="Home",
        full_name="Ada",
        phone="+2348000000000",
        address_line_1="1 Marina Rd",
        city="Lagos",
        state="Lagos",
        lga="Eti-Osa",
    )
    Address.objects.create(
        user=user,
        label="Office",
        full_name="Ada",
        phone="+2348000000000",
        address_line_1="2 Broad St",
        city="Lagos",
        state="Lagos",
        lga="Lagos Island",
    )
    assert user.addresses.count() == 2


def test_only_one_default_address_per_user():
    user = make_user()
    Address.objects.create(
        user=user,
        label="Home",
        full_name="Ada",
        phone="+2348000000000",
        address_line_1="1 Marina Rd",
        city="Lagos",
        state="Lagos",
        lga="Eti-Osa",
        is_default=True,
    )
    with pytest.raises(IntegrityError), transaction.atomic():
        Address.objects.create(
            user=user,
            label="Office",
            full_name="Ada",
            phone="+2348000000000",
            address_line_1="2 Broad St",
            city="Lagos",
            state="Lagos",
            lga="Lagos Island",
            is_default=True,
        )


def test_two_users_can_each_have_their_own_default_address():
    u1, u2 = make_user("a@example.com"), make_user("b@example.com")
    Address.objects.create(
        user=u1,
        label="Home",
        full_name="Ada",
        phone="+2348000000000",
        address_line_1="1 Marina Rd",
        city="Lagos",
        state="Lagos",
        lga="Eti-Osa",
        is_default=True,
    )
    Address.objects.create(
        user=u2,
        label="Home",
        full_name="Bo",
        phone="+2348000000001",
        address_line_1="2 Broad St",
        city="Lagos",
        state="Lagos",
        lga="Lagos Island",
        is_default=True,
    )
    assert Address.objects.filter(is_default=True).count() == 2
