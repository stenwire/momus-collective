import uuid

import pytest
from django.db import IntegrityError, transaction

from newsletter.models import NewsletterSubscriber

pytestmark = pytest.mark.django_db


def test_subscriber_pk_is_a_uuid():
    sub = NewsletterSubscriber.objects.create(email="fan@example.com")
    assert isinstance(sub.id, uuid.UUID)


def test_email_is_unique():
    NewsletterSubscriber.objects.create(email="fan@example.com")
    with pytest.raises(IntegrityError), transaction.atomic():
        NewsletterSubscriber.objects.create(email="fan@example.com")


def test_is_active_defaults_true_unsubscribed_at_defaults_null():
    sub = NewsletterSubscriber.objects.create(email="fan@example.com")
    assert sub.is_active is True
    assert sub.unsubscribed_at is None
