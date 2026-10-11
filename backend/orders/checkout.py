"""The one place an order's money is worked out (DRY-01, SEC-06). Every
figure comes from server-held prices; nothing priced by the client counts."""

from dataclasses import dataclass, field

from rest_framework.exceptions import ValidationError

from carts.models import CartItem
from carts.services import unit_price, user_cart, validate_line
from catalog.models import Product
from designs.pricing import price_list

from .delivery import band_for, delivery_settings, fee_for


@dataclass
class Line:
    product: Product | None
    saved_design: object | None
    size: str
    color: str
    quantity: int
    unit_price: int

    @property
    def total(self):
        return self.unit_price * self.quantity

    @property
    def title(self):
        return self.product.slogan if self.product else "Custom Design"


@dataclass
class Quote:
    lines: list[Line]
    subtotal: int
    delivery_fee: int | None = None
    delivery_band: str | None = None
    discount: int = 0
    notes: list[str] = field(default_factory=list)

    @property
    def total(self):
        fee = self.delivery_fee or 0
        return max(self.subtotal + fee - self.discount, 0)


def _unavailable(title):
    return ValidationError(
        {"items": f"“{title}” is no longer available. Remove it to continue."}
    )


def cart_lines(user):
    """A signed-in customer pays for their server cart, whatever the
    request body says."""
    items = list(
        CartItem.objects.filter(cart=user_cart(user))
        .select_related("product", "saved_design")
        .order_by("created_at")
    )
    prices = price_list()
    lines = []
    for item in items:
        if item.product_id and not item.product.is_active:
            raise _unavailable(item.product.slogan)
        lines.append(
            Line(
                item.product,
                item.saved_design,
                item.size,
                item.color,
                item.quantity,
                unit_price(item, prices),
            )
        )
    return lines


def guest_lines(raw_items):
    """A guest's lines arrive from the browser: re-validated and re-priced
    here, catalog products only (D-075)."""
    ids = [item["product"] for item in raw_items]
    products = Product.objects.in_bulk(ids)
    lines = []
    for item in raw_items:
        product = products.get(item["product"])
        if product is None or not product.is_active:
            raise _unavailable(product.slogan if product else "An item")
        color = validate_line(None, product, None, item["size"], item["color"])
        lines.append(
            Line(product, None, item["size"], color, item["quantity"], product.price)
        )
    return lines


def quote(lines, shipping=None):
    """Delivery is priced once the address gives a state (and LGA in Lagos);
    until then the fee is None and the total excludes it."""
    if not lines:
        raise ValidationError({"items": "Your bag is empty."})
    result = Quote(lines=lines, subtotal=sum(line.total for line in lines))
    if shipping and shipping.get("state"):
        settings = delivery_settings()
        band = band_for(shipping["state"], shipping.get("lga", ""), settings)
        result.delivery_band = band
        result.delivery_fee = fee_for(band, result.subtotal, settings)
        if result.delivery_fee == 0:
            result.notes.append("Free delivery on this order.")
    return result
