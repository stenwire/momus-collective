import hashlib
import hmac
import json
import re

import pytest
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import Address, User
from carts.models import CartItem, SavedDesign
from carts.services import add_line, user_cart
from designs.storage import design_storage, order_item_file_name
from designs.tests.test_saved_designs import CONFIG
from orders import paystack
from orders.models import CheckoutSession, Order, OrderItem
from promocodes.models import PromoCode

pytestmark = pytest.mark.django_db
SECRET = "sk_test_fulfil"


@pytest.fixture(autouse=True)
def keys(settings, tmp_path):
    settings.PAYSTACK_SECRET_KEY = SECRET
    settings.PAYSTACK_PUBLIC_KEY = "pk_test_fulfil"
    settings.DESIGN_FILES_ROOT = tmp_path / "design-files"
    settings.BACKEND_URL = "http://api.test"


def client_for(user):
    client = APIClient()
    client.credentials(
        HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(user).access_token}"
    )
    return client


SHIPPING = {
    "full_name": "Ada Lovelace",
    "phone": "+2348000000000",
    "address_line_1": "12 Admiralty Way",
    "city": "Lekki",
    "state": "Lagos",
    "lga": "Eti-Osa",
    "notes": "Gate code 4421",
}


def start(client, **body):
    return client.post(
        "/api/v1/checkout/", {"shipping": SHIPPING, **body}, format="json"
    ).json()


def guest_start(product, **extra):
    items = [{"product": str(product.id), "size": "M", "color": "", "quantity": 2}]
    return start(APIClient(), **{"items": items, "email": "guest@example.com", **extra})


def pay(monkeypatch, start_body):
    monkeypatch.setattr(
        paystack,
        "verify_transaction",
        lambda ref: {
            "status": "success",
            "amount": start_body["amount"],
            "currency": "NGN",
        },
    )
    return APIClient().post(
        "/api/v1/checkout/verify/",
        {"reference": start_body["reference"]},
        format="json",
    )


def webhook(reference, amount):
    body = json.dumps(
        {
            "event": "charge.success",
            "data": {
                "reference": reference,
                "amount": amount,
                "requested_amount": amount,
                "currency": "NGN",
                "status": "success",
            },
        }
    ).encode()
    sig = hmac.new(SECRET.encode(), body, hashlib.sha512).hexdigest()
    return APIClient().post(
        "/api/v1/payments/paystack/webhook/",
        body,
        content_type="application/json",
        HTTP_X_PAYSTACK_SIGNATURE=sig,
    )


def test_a_paid_guest_checkout_becomes_an_order(product, monkeypatch):
    body = guest_start(product)
    resp = pay(monkeypatch, body).json()
    order = Order.objects.get(paystack_reference=body["reference"])
    assert re.fullmatch(rf"MOM-{timezone.now():%Y%m%d}-\d{{3}}", order.order_number)
    assert resp["order_number"] == order.order_number
    assert resp["tracking_token"] == order.tracking_token
    assert (order.guest_email, order.guest_phone) == (
        "guest@example.com",
        "+2348000000000",
    )
    assert order.status == "paid"
    assert order.status_history[0]["status"] == "paid"
    assert (order.subtotal, order.delivery_fee, order.total) == (
        2000000,
        300000,
        2300000,
    )
    [item] = OrderItem.objects.filter(order=order)
    assert (item.slogan_text, item.size, item.quantity, item.unit_price) == (
        "touch grass",
        "M",
        2,
        1000000,
    )
    product.refresh_from_db()
    assert product.total_orders == 2


def test_order_numbers_run_sequentially_through_the_day(product, monkeypatch):
    numbers = []
    for _ in range(3):
        body = guest_start(product)
        pay(monkeypatch, body)
        numbers.append(
            Order.objects.get(paystack_reference=body["reference"]).order_number
        )
    assert [n[-3:] for n in numbers] == ["001", "002", "003"]
    assert len({n[:12] for n in numbers}) == 1


def test_shipping_address_is_a_snapshot_not_the_saved_address(
    product, user, monkeypatch
):
    saved = Address.objects.create(
        user=user,
        label="Home",
        full_name="Ada Lovelace",
        phone="+2348000000000",
        address_line_1="12 Admiralty Way",
        city="Lekki",
        state="Lagos",
        lga="Eti-Osa",
        is_default=True,
    )
    add_line(user_cart(user), product=product, size="M", color="", quantity=1)
    body = start(client_for(user))
    pay(monkeypatch, body)
    order = Order.objects.get(paystack_reference=body["reference"])
    saved.address_line_1 = "99 Somewhere Else"
    saved.state = "Oyo"
    saved.save()
    order.refresh_from_db()
    assert order.shipping_address["address_line_1"] == "12 Admiralty Way"
    assert order.shipping_address["state"] == "Lagos"
    assert order.shipping_address["notes"] == "Gate code 4421"
    assert not hasattr(order, "address")


def test_a_replayed_webhook_creates_no_second_order(product, monkeypatch):
    body = guest_start(product)
    for _ in range(3):
        assert webhook(body["reference"], body["amount"]).status_code == 200
    pay(monkeypatch, body)
    assert Order.objects.filter(paystack_reference=body["reference"]).count() == 1


def test_a_customers_server_cart_is_emptied_by_their_order(product, user, monkeypatch):
    add_line(user_cart(user), product=product, size="M", color="", quantity=1)
    body = start(client_for(user))
    pay(monkeypatch, body)
    order = Order.objects.get(paystack_reference=body["reference"])
    assert order.user == user and order.guest_email == ""
    assert not CartItem.objects.filter(cart__user=user).exists()


def test_a_custom_design_is_frozen_into_its_own_print_file(
    user, monkeypatch, django_capture_on_commit_callbacks
):
    design = SavedDesign.objects.create(user=user, name="mine", config=CONFIG)
    add_line(user_cart(user), saved_design=design, size="L", color="", quantity=1)
    body = start(client_for(user))
    # The render is queued on commit, after the order is safely saved.
    with django_capture_on_commit_callbacks(execute=True):
        pay(monkeypatch, body)
    item = OrderItem.objects.get(order__paystack_reference=body["reference"])
    assert item.saved_design == design
    assert item.slogan_text == CONFIG["text"]
    assert (
        item.design_file_url
        == f"http://api.test/api/v1/orders/items/{item.id}/design-file/"
    )
    assert design_storage().exists(order_item_file_name(item.id))
    # Editing the saved design afterwards doesn't touch the ordered file.
    before = design_storage().open(order_item_file_name(item.id)).read()
    SavedDesign.objects.filter(id=design.id).update(
        config={**CONFIG, "text": "changed"}
    )
    assert design_storage().open(order_item_file_name(item.id)).read() == before


def test_the_ordered_print_file_authz_is_staff_only(
    user, monkeypatch, django_capture_on_commit_callbacks
):
    design = SavedDesign.objects.create(user=user, name="mine", config=CONFIG)
    add_line(user_cart(user), saved_design=design, size="L", color="", quantity=1)
    body = start(client_for(user))
    # The render is queued on commit, after the order is safely saved.
    with django_capture_on_commit_callbacks(execute=True):
        pay(monkeypatch, body)
    item = OrderItem.objects.get(order__paystack_reference=body["reference"])
    url = f"/api/v1/orders/items/{item.id}/design-file/"
    assert APIClient().get(url).status_code == 401
    assert client_for(user).get(url).status_code == 403
    staff = User.objects.create_user(
        email="staff@example.com",
        password="correct-horse-battery",
        first_name="S",
        phone="1",
        is_staff=True,
    )
    assert client_for(staff).get(url).status_code == 200


def test_a_promo_use_is_counted_on_the_order(product, monkeypatch):
    promo = PromoCode.objects.create(
        code="NAPS20", discount_type="percentage", discount_value=20, max_uses=10
    )
    body = guest_start(product, promo_code="naps20")
    pay(monkeypatch, body)
    order = Order.objects.get(paystack_reference=body["reference"])
    assert order.discount == 400000
    promo.refresh_from_db()
    assert promo.uses_count == 1
    assert order.promo_redemption.discount == 400000
    assert order.notes == ""


def test_a_code_filled_between_pay_and_order_is_honoured_and_flagged(
    product, monkeypatch
):
    promo = PromoCode.objects.create(
        code="LAST1", discount_type="flat", discount_value=100000, max_uses=1
    )
    body = guest_start(product, promo_code="LAST1")
    PromoCode.objects.filter(id=promo.id).update(uses_count=1)
    pay(monkeypatch, body)
    order = Order.objects.get(paystack_reference=body["reference"])
    assert order.discount == 100000
    assert "over its limit" in order.notes


def test_an_unpaid_session_has_no_order(product):
    body = guest_start(product)
    session = CheckoutSession.objects.get(reference=body["reference"])
    assert session.order is None
    assert not Order.objects.filter(paystack_reference=body["reference"]).exists()
