import uuid

from django.db import models


class NewsletterSubscriber(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    is_active = models.BooleanField(default=True)
    subscribed_at = models.DateTimeField(auto_now_add=True)
    unsubscribed_at = models.DateTimeField(null=True, blank=True)
    # The weekly New Drops send skips anyone sent one in the past 6 days.
    last_new_drops_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.email
