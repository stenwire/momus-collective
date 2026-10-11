import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User
from catalog.models import Category, Product
from orders.models import DeliverySettings

pytestmark = pytest.mark.django_db
QUOTE = "/api/v1/checkout/quote/"


@pytest.fixture
def product():
    category = Category.objects.create(name="Test Category", slug="test-category")
    return Product.objects.create(
        slogan="touch grass", slug="tg", category=category, price=1000000
    )


@pytest.fixture
def settings_row():
    DeliverySettings.objects.filter(pk=1).update(
        lagos_within_fee=200000,
        lagos_cross_fee=300000,
        outside_lagos_fee=500000,
        free_delivery_threshold=2500000,
        origin_side="mainland",
    )
    return DeliverySettings.objects.get(pk=1)


def quote_for(product, quantity=1, **shipping):
    body = {
        "items": [
            {"product": str(product.id), "size": "M", "color": "", "quantity": quantity}
        ],
        "shipping": shipping,
    }
    return APIClient().post(QUOTE, body, format="json")


@pytest.mark.parametrize(
    "state,lga,band,fee",
    [
        ("Lagos", "Ikeja", "lagos_within", 200000),
        ("Lagos", "Eti-Osa", "lagos_cross", 300000),
        ("Oyo", "Ibadan North", "outside_lagos", 500000),
        ("FCT", "", "outside_lagos", 500000),
    ],
)
def test_each_band_charges_its_flat_fee(product, settings_row, state, lga, band, fee):
    body = quote_for(product, state=state, lga=lga).json()
    assert body["delivery_band"] == band
    assert body["delivery_fee"] == fee
    assert body["total"] == 1000000 + fee


def test_within_and_cross_follow_the_dispatch_side(product, settings_row):
    settings_row.origin_side = "island"
    settings_row.save()
    assert quote_for(product, state="Lagos", lga="Eti-Osa").json()["delivery_band"] == (
        "lagos_within"
    )
    assert quote_for(product, state="Lagos", lga="Ikeja").json()["delivery_band"] == (
        "lagos_cross"
    )


def test_orders_at_the_threshold_ship_free(product, settings_row):
    body = quote_for(product, quantity=3, state="Oyo", lga="x").json()
    assert body["subtotal"] == 3000000
    assert body["delivery_fee"] == 0
    assert "Free delivery on this order." in body["notes"]
    just_under = quote_for(product, quantity=2, state="Oyo", lga="x").json()
    assert just_under["delivery_fee"] == 500000


def test_no_threshold_means_no_free_delivery(product, settings_row):
    settings_row.free_delivery_threshold = None
    settings_row.save()
    assert (
        quote_for(product, quantity=10, state="Oyo", lga="x").json()["delivery_fee"]
        == 500000
    )


def test_no_address_yet_means_no_delivery_fee_in_the_total(product, settings_row):
    body = quote_for(product).json()
    assert body["delivery_fee"] is None
    assert body["total"] == 1000000


@pytest.mark.parametrize(
    "state,lga,field", [("Atlantis", "", "state"), ("Lagos", "Nowhere", "lga")]
)
def test_unknown_states_and_lagos_lgas_are_refused(
    product, settings_row, state, lga, field
):
    resp = quote_for(product, state=state, lga=lga)
    assert resp.status_code == 400
    assert field in resp.json()["shipping"]


def test_public_delivery_info_for_the_bag_estimate(settings_row):
    body = APIClient().get("/api/v1/checkout/delivery/").json()
    assert body == {
        "fees": {
            "lagos_within": 200000,
            "lagos_cross": 300000,
            "outside_lagos": 500000,
        },
        "free_delivery_threshold": 2500000,
    }


def staff_client(is_staff=True):
    user = User.objects.create_user(
        email="s@example.com",
        password="correct-horse-battery",
        first_name="S",
        phone="1",
        is_staff=is_staff,
    )
    client = APIClient()
    client.credentials(
        HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(user).access_token}"
    )
    return client


def test_admin_delivery_settings_authz_need_staff(settings_row):
    url = "/api/v1/admin/delivery-settings/"
    assert APIClient().get(url).status_code == 401
    customer = staff_client(is_staff=False)
    assert customer.get(url).status_code == 403
    assert (
        customer.patch(url, {"outside_lagos_fee": 1}, format="json").status_code == 403
    )
    assert DeliverySettings.objects.get(pk=1).outside_lagos_fee == 500000


def test_admin_sets_fees_and_threshold_and_the_quote_follows(product, settings_row):
    resp = staff_client().patch(
        "/api/v1/admin/delivery-settings/",
        {"outside_lagos_fee": 650000, "free_delivery_threshold": None},
        format="json",
    )
    assert resp.status_code == 200
    body = quote_for(product, quantity=5, state="Oyo", lga="x").json()
    assert body["delivery_fee"] == 650000


@pytest.mark.parametrize(
    "patch",
    [{"lagos_within_fee": -1}, {"origin_side": "moon"}, {"lagos_days_min": 9}],
)
def test_admin_delivery_settings_reject_bad_values(settings_row, patch):
    resp = staff_client().patch(
        "/api/v1/admin/delivery-settings/", patch, format="json"
    )
    assert resp.status_code == 400
