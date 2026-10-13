"""FR-NOT-04: the weekly New Drops email to active subscribers, featuring
the shirts added that week, each with the subscriber's unsubscribe link."""

from datetime import timedelta

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.db.models import Q
from django.template.loader import render_to_string
from django.utils import timezone

from catalog.models import Product
from config.email import EmailNotSent
from config.money import naira

from .models import NewsletterSubscriber
from .services import unsubscribe_url

WINDOW = timedelta(days=7)
RESEND_GAP = timedelta(days=6)
MAX_PRODUCTS = 6


def new_products(now):
    products = Product.objects.filter(is_active=True, created_at__gte=now - WINDOW)
    return [
        {
            "slogan": p.slogan,
            "price": naira(p.price),
            "image": p.mockup_images[0] if p.mockup_images else None,
            "url": f"{settings.FRONTEND_URL}/product/{p.slug}",
        }
        for p in products.order_by("-created_at")[:MAX_PRODUCTS]
    ]


def _send(subscriber, products):
    link = unsubscribe_url(subscriber)
    context = {
        "products": products,
        "unsubscribe_url": link,
        "shop_url": f"{settings.FRONTEND_URL}/shop",
    }
    message = EmailMultiAlternatives(
        subject=f"New drops: {products[0]['slogan']}"
        + (f" and {len(products) - 1} more" if len(products) > 1 else ""),
        body=render_to_string("newsletter/email/new_drops.txt", context),
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[subscriber.email],
        headers={"List-Unsubscribe": f"<{link}>"},
    )
    message.attach_alternative(
        render_to_string("newsletter/email/new_drops.html", context), "text/html"
    )
    message.send()


def send_new_drops(now=None):
    """Returns how many were sent. A failed send is retried next run."""
    now = now or timezone.now()
    products = new_products(now)
    if not products:
        return 0
    due = NewsletterSubscriber.objects.filter(is_active=True).filter(
        Q(last_new_drops_at__isnull=True) | Q(last_new_drops_at__lt=now - RESEND_GAP)
    )
    sent = 0
    for subscriber in due.iterator():
        try:
            _send(subscriber, products)
        except EmailNotSent:
            continue
        NewsletterSubscriber.objects.filter(pk=subscriber.pk).update(
            last_new_drops_at=now
        )
        sent += 1
    return sent
