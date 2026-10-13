import re
from datetime import timedelta

import pytest
from celery.schedules import crontab
from django.conf import settings as django_settings
from django.core import mail
from django.utils import timezone
from rest_framework.test import APIClient

from catalog.models import Category, Product
from config.email import EmailNotSent
from newsletter import new_drops
from newsletter.models import NewsletterSubscriber
from newsletter.services import subscribe

pytestmark = pytest.mark.django_db


def shirt(slug, days_old=1, active=True, price=1500000):
    category, _ = Category.objects.get_or_create(
        name="Test Category", slug="test-category"
    )
    p = Product.objects.create(
        slogan=slug,
        slug=slug,
        category=category,
        price=price,
        is_active=active,
        mockup_images=[f"https://example.com/{slug}.png"],
    )
    Product.objects.filter(pk=p.pk).update(
        created_at=timezone.now() - timedelta(days=days_old)
    )
    return p


def test_active_subscribers_get_this_weeks_new_shirts(settings):
    shirt("fresh-one", days_old=1)
    shirt("fresh-two", days_old=6)
    shirt("old", days_old=9)
    shirt("archived", days_old=1, active=False)
    ada = subscribe("ada@example.com")
    subscribe("gone@example.com")
    NewsletterSubscriber.objects.filter(email="gone@example.com").update(
        is_active=False
    )
    assert new_drops.send_new_drops() == 1
    [email] = mail.outbox
    assert email.to == ["ada@example.com"]
    assert email.subject == "New drops: fresh-one and 1 more"
    assert "/product/fresh-one" in email.body and "/product/fresh-two" in email.body
    assert "/product/old" not in email.body and "archived" not in email.body
    assert "₦15,000" in email.body
    link = re.search(r"Unsubscribe: (\S+)", email.body).group(1)
    assert email.extra_headers["List-Unsubscribe"] == f"<{link}>"
    token = link.split("token=")[1]
    assert (
        APIClient()
        .post("/api/v1/newsletter/unsubscribe/", {"token": token}, format="json")
        .status_code
        == 200
    )
    ada.refresh_from_db()
    assert not ada.is_active


def test_no_new_shirts_means_no_email():
    shirt("old", days_old=10)
    subscribe("ada@example.com")
    assert new_drops.send_new_drops() == 0 and mail.outbox == []


def test_a_rerun_in_the_same_week_sends_nothing_more_but_next_week_does():
    shirt("fresh", days_old=1)
    subscribe("ada@example.com")
    now = timezone.now()
    assert new_drops.send_new_drops(now) == 1
    assert new_drops.send_new_drops(now + timedelta(hours=2)) == 0
    shirt("next-week", days_old=-7)
    assert new_drops.send_new_drops(now + timedelta(days=7)) == 1
    assert len(mail.outbox) == 2


def test_a_failed_send_is_retried_next_run(monkeypatch):
    shirt("fresh", days_old=1)
    subscribe("ada@example.com")
    subscribe("bo@example.com")
    real = new_drops._send

    def flaky(subscriber, products):
        if subscriber.email == "bo@example.com":
            raise EmailNotSent("down")
        real(subscriber, products)

    monkeypatch.setattr(new_drops, "_send", flaky)
    assert new_drops.send_new_drops() == 1
    monkeypatch.setattr(new_drops, "_send", real)
    assert new_drops.send_new_drops() == 1
    assert sorted(m.to[0] for m in mail.outbox) == ["ada@example.com", "bo@example.com"]


def test_each_email_holds_at_most_six_shirts():
    for n in range(8):
        shirt(f"s{n}", days_old=1)
    subscribe("ada@example.com")
    new_drops.send_new_drops()
    assert mail.outbox[0].body.count("/product/") == 6


def test_it_runs_fridays_at_ten_lagos_time():
    entry = django_settings.CELERY_BEAT_SCHEDULE["weekly-new-drops"]
    assert entry["task"] == "newsletter.tasks.weekly_new_drops"
    assert entry["schedule"] == crontab(hour=10, minute=0, day_of_week="friday")
