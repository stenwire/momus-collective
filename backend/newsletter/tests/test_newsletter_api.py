import pytest
from rest_framework.test import APIClient

from newsletter.models import NewsletterSubscriber
from newsletter.services import subscribe, unsubscribe_token, unsubscribe_url

pytestmark = pytest.mark.django_db
SUBSCRIBE = "/api/v1/newsletter/subscribe/"
UNSUBSCRIBE = "/api/v1/newsletter/unsubscribe/"


def post(url, body):
    return APIClient().post(url, body, format="json")


def test_subscribing_stores_the_email_once():
    first = post(SUBSCRIBE, {"email": " Ada@Example.com "})
    again = post(SUBSCRIBE, {"email": "ada@example.com"})
    assert first.status_code == again.status_code == 200
    assert first.json() == again.json() == {"detail": "You're on the list."}
    [sub] = NewsletterSubscriber.objects.all()
    assert (sub.email, sub.is_active) == ("ada@example.com", True)


def test_a_bad_email_is_refused():
    assert post(SUBSCRIBE, {"email": "not-an-email"}).status_code == 400
    assert post(SUBSCRIBE, {}).status_code == 400
    assert not NewsletterSubscriber.objects.exists()


def test_unsubscribing_by_signed_link_and_resubscribing():
    sub = subscribe("ada@example.com")
    assert unsubscribe_url(sub).endswith(
        f"/newsletter/unsubscribe?token={unsubscribe_token(sub)}"
    )
    resp = post(UNSUBSCRIBE, {"token": unsubscribe_token(sub)})
    assert resp.status_code == 200
    sub.refresh_from_db()
    assert not sub.is_active and sub.unsubscribed_at is not None
    assert post(UNSUBSCRIBE, {"token": unsubscribe_token(sub)}).status_code == 200
    post(SUBSCRIBE, {"email": "ada@example.com"})
    sub.refresh_from_db()
    assert sub.is_active and sub.unsubscribed_at is None


def test_a_forged_or_tampered_token_unsubscribes_nobody():
    sub = subscribe("ada@example.com")
    token = unsubscribe_token(sub)
    for bad in ("", "nonsense", token[:-2] + "xx", str(sub.id)):
        assert post(UNSUBSCRIBE, {"token": bad}).status_code == 400
    sub.refresh_from_db()
    assert sub.is_active


def test_subscribing_is_throttled():
    statuses = [
        post(SUBSCRIBE, {"email": f"s{n}@example.com"}).status_code for n in range(11)
    ]
    assert statuses[:10] == [200] * 10 and statuses[10] == 429
