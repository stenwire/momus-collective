from django.db import IntegrityError, transaction
from rest_framework.exceptions import ValidationError

from catalog.options import SIZES
from designs.pricing import price_list

from .models import Cart, CartItem

MAX_LINE_QUANTITY = 10


def user_cart(user):
    """The user's one server cart (D-082), created on first use."""
    cart = Cart.objects.filter(user=user).first()
    if cart:
        return cart
    try:
        with transaction.atomic():
            return Cart.objects.create(user=user)
    except IntegrityError:
        return Cart.objects.get(user=user)


def unit_price(item, prices):
    """Today's server price for a line, never a stored or client value."""
    if item.product_id:
        return item.product.price
    return prices[item.saved_design.config["shirt_color"]]


def validate_line(user, product, saved_design, size, color):
    """Returns the colour the line will carry. A custom design's colour is
    its own shirt colour; a catalog product's must be one it's offered in."""
    if size not in SIZES:
        raise ValidationError({"size": f"Choose one of {', '.join(SIZES)}."})
    if product is not None:
        if not product.is_active:
            raise ValidationError({"product": "This product is no longer available."})
        if product.shirt_colors and color not in product.shirt_colors:
            raise ValidationError({"color": f"{color!r} isn't offered for this shirt."})
        return color or (product.shirt_colors[0] if product.shirt_colors else "")
    if saved_design.user_id != user.id:
        raise ValidationError({"saved_design": "Not one of your designs."})
    return saved_design.config["shirt_color"]


def add_line(cart, *, product=None, saved_design=None, size, color, quantity):
    """Same item, size and colour: the quantities add up on one line."""
    color = validate_line(cart.user, product, saved_design, size, color)
    with transaction.atomic():
        line = (
            CartItem.objects.select_for_update()
            .filter(
                cart=cart,
                product=product,
                saved_design=saved_design,
                size=size,
                color=color,
            )
            .first()
        )
        prices = price_list() if saved_design else {}
        if line:
            line.quantity = min(line.quantity + quantity, MAX_LINE_QUANTITY)
        else:
            line = CartItem(
                cart=cart,
                product=product,
                saved_design=saved_design,
                size=size,
                color=color,
                quantity=min(quantity, MAX_LINE_QUANTITY),
            )
        line.unit_price = unit_price(line, prices)
        line.save()
    return line
