import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User
from carts.models import SavedDesign
from designs.models import CustomPricing, ShirtBlank
from designs.options import SHIRT_COLORS
from designs.pricing import custom_design_price, price_list

from .test_saved_designs import CONFIG

pytestmark = pytest.mark.django_db


def make_user(email="u@example.com", **extra):
    return User.objects.create_user(
        email=email,
        password="correct-horse-battery",
        first_name="A",
        phone="1",
        **extra,
    )


def client_for(user):
    client = APIClient()
    token = RefreshToken.for_user(user).access_token
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return client


def test_every_shirt_colour_has_a_seeded_blank_and_one_pricing_row():
    assert set(ShirtBlank.objects.values_list("color", flat=True)) == set(SHIRT_COLORS)
    assert CustomPricing.objects.count() == 1


def test_price_is_blank_plus_print_plus_margin():
    CustomPricing.objects.filter(pk=1).update(print_cost=400000, margin=500000)
    ShirtBlank.objects.filter(color="Navy").update(blank_cost=420000)
    assert custom_design_price("Navy") == 420000 + 400000 + 500000


def test_price_varies_by_shirt_colour():
    ShirtBlank.objects.filter(color="White").update(blank_cost=300000)
    ShirtBlank.objects.filter(color="Maroon").update(blank_cost=450000)
    prices = price_list()
    assert prices["Maroon"] - prices["White"] == 150000


def test_price_list_is_two_queries():
    with CaptureQueriesContext(connection) as queries:
        price_list()
    assert len(queries) == 2


def test_public_pricing_shows_prices_not_the_cost_breakdown():
    resp = APIClient().get("/api/v1/designs/pricing/")
    assert resp.status_code == 200
    body = resp.json()
    assert body == {"prices": price_list()}
    assert "margin" not in str(body) and "print_cost" not in str(body)


def test_admin_pricing_needs_staff():
    url = "/api/v1/admin/design-pricing/"
    customer = client_for(make_user())
    assert APIClient().get(url).status_code == 401
    assert customer.get(url).status_code == 403
    assert customer.patch(url, {"margin": 1}, format="json").status_code == 403
    assert CustomPricing.objects.get(pk=1).margin != 1


def test_admin_sets_blank_print_and_margin():
    admin = client_for(make_user("admin@example.com", is_staff=True))
    resp = admin.patch(
        "/api/v1/admin/design-pricing/",
        {"print_cost": 300000, "margin": 600000, "blank_costs": {"Black": 380000}},
        format="json",
    )
    assert resp.status_code == 200
    assert resp.json()["blank_costs"]["Black"] == 380000
    assert custom_design_price("Black") == 380000 + 300000 + 600000
    public = APIClient().get("/api/v1/designs/pricing/").json()
    assert public["prices"]["Black"] == 1280000


@pytest.mark.parametrize(
    "body",
    [
        {"margin": -1},
        {"print_cost": 1.5},
        {"blank_costs": {"Neon": 1}},
        {"margin": "lots"},
    ],
)
def test_admin_pricing_rejects_bad_values_and_changes_nothing(body):
    admin = client_for(make_user("admin@example.com", is_staff=True))
    before = (CustomPricing.objects.get(pk=1).margin, price_list())
    resp = admin.patch("/api/v1/admin/design-pricing/", body, format="json")
    assert resp.status_code == 400
    assert (CustomPricing.objects.get(pk=1).margin, price_list()) == before


def test_saved_designs_carry_their_server_computed_price():
    user = make_user()
    client = client_for(user)
    body = {"name": "x", "config": {**CONFIG, "shirt_color": "Navy"}, "price": 1}
    resp = client.post("/api/v1/designs/", body, format="json")
    assert resp.json()["price"] == price_list()["Navy"]
    listed = client.get("/api/v1/designs/").json()[0]
    assert listed["price"] == price_list()["Navy"]


def test_design_list_query_count_stays_constant_with_prices():
    user = make_user()
    for _ in range(2):
        SavedDesign.objects.create(user=user, name="x", config=CONFIG)
    client = client_for(user)
    with CaptureQueriesContext(connection) as few:
        client.get("/api/v1/designs/")
    for _ in range(10):
        SavedDesign.objects.create(user=user, name="x", config=CONFIG)
    with CaptureQueriesContext(connection) as many:
        client.get("/api/v1/designs/")
    assert len(many) == len(few)
