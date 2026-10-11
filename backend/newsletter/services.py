from django.conf import settings
from django.core import signing
from django.utils import timezone

from .models import NewsletterSubscriber

# No expiry: an unsubscribe link in an old email must keep working.
SALT = "newsletter-unsubscribe"


def subscribe(email):
    email = email.strip().lower()
    subscriber, created = NewsletterSubscriber.objects.get_or_create(email=email)
    if not created and not subscriber.is_active:
        subscriber.is_active = True
        subscriber.unsubscribed_at = None
        subscriber.save(update_fields=["is_active", "unsubscribed_at"])
    return subscriber


def unsubscribe_token(subscriber):
    return signing.dumps(str(subscriber.id), salt=SALT)


def unsubscribe_url(subscriber):
    token = unsubscribe_token(subscriber)
    return f"{settings.FRONTEND_URL}/newsletter/unsubscribe?token={token}"


def unsubscribe(token):
    try:
        subscriber_id = signing.loads(token, salt=SALT)
    except signing.BadSignature:
        return None
    subscriber = NewsletterSubscriber.objects.filter(pk=subscriber_id).first()
    if subscriber and subscriber.is_active:
        subscriber.is_active = False
        subscriber.unsubscribed_at = timezone.now()
        subscriber.save(update_fields=["is_active", "unsubscribed_at"])
    return subscriber
