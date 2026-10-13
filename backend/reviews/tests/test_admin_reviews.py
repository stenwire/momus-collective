import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient

from accounts.models import User
from orders.tests.test_fulfilment import client_for
from reviews.models import Review
from reviews.services import refresh_rating
from reviews.tests.test_reviews_api import buyer, order

pytestmark = pytest.mark.django_db
URL = "/api/v1/admin/reviews/"


@pytest.fixture
def staff():
    return client_for(
        User.objects.create_user(
            email="owner@example.com", password="x" * 12, phone="1", is_staff=True
        )
    )


def review(product, n, rating, text="ok"):
    user = buyer(f"r{n}@example.com", f"R{n}", "")
    return Review.objects.create(
        product=product, order=order(product, user), user=user, rating=rating, text=text
    )


def test_admin_reviews_authz(shirt):
    r = review(shirt, 1, 5)
    customer = client_for(buyer("c@example.com"))
    for client, status in ((APIClient(), 401), (customer, 403)):
        assert client.get(URL).status_code == status
        resp = client.patch(f"{URL}{r.id}/", {"is_flagged": True}, format="json")
        assert resp.status_code == status
    r.refresh_from_db()
    assert not r.is_flagged


def test_hiding_needs_a_reason_and_leaves_the_public_page_and_rating(staff, shirt):
    good, bad = review(shirt, 1, 5), review(shirt, 2, 1, "spam spam")
    refresh_rating(shirt)
    assert (
        staff.patch(f"{URL}{bad.id}/", {"is_visible": False}, format="json").status_code
        == 400
    )
    resp = staff.patch(
        f"{URL}{bad.id}/", {"is_visible": False, "hidden_reason": "spam"}, format="json"
    )
    assert resp.status_code == 200
    assert (resp.json()["is_visible"], resp.json()["hidden_reason_label"]) == (
        False,
        "Spam",
    )
    public = APIClient().get(f"/api/v1/products/{shirt.slug}/reviews/").json()
    assert [r["id"] for r in public["results"]] == [str(good.id)]
    shirt.refresh_from_db()
    assert str(shirt.avg_rating) == "5.00"
    staff.patch(f"{URL}{bad.id}/", {"is_visible": True}, format="json")
    bad.refresh_from_db()
    shirt.refresh_from_db()
    assert (
        bad.is_visible and bad.hidden_reason == "" and str(shirt.avg_rating) == "3.00"
    )


def test_flagging_keeps_a_review_up(staff, shirt):
    r = review(shirt, 1, 3)
    assert staff.patch(f"{URL}{r.id}/", {"is_flagged": True}, format="json").json()[
        "is_flagged"
    ]
    r.refresh_from_db()
    assert r.is_flagged and r.is_visible
    public = APIClient().get(f"/api/v1/products/{shirt.slug}/reviews/").json()
    assert public["count"] == 1


def test_the_admin_list_filters_and_searches(staff, shirt):
    a, b, c = (
        review(shirt, 1, 5, "love it"),
        review(shirt, 2, 1, "buy crypto"),
        review(shirt, 3, 4),
    )
    Review.objects.filter(pk=b.pk).update(is_visible=False, hidden_reason="spam")
    Review.objects.filter(pk=c.pk).update(is_flagged=True)

    def ids(**params):
        return {r["id"] for r in staff.get(URL, params).json()["results"]}

    assert ids() == {str(a.id), str(b.id), str(c.id)}
    assert ids(show="hidden") == {str(b.id)}
    assert ids(show="flagged") == {str(c.id)}
    assert ids(show="visible") == {str(a.id), str(c.id)}
    assert ids(search="crypto") == {str(b.id)}
    body = staff.get(URL).json()
    assert [x["key"] for x in body["reasons"]] == ["offensive", "spam", "irrelevant"]
    assert staff.get(URL, {"show": "deleted"}).status_code == 400


def test_admin_reviews_num_queries_are_constant(staff, shirt):
    review(shirt, 1, 5)
    with CaptureQueriesContext(connection) as few:
        staff.get(URL)
    for n in range(2, 12):
        review(shirt, n, 4)
    with CaptureQueriesContext(connection) as many:
        staff.get(URL)
    assert len(few) == len(many)
