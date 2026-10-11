"""FR-CART-08: flat delivery fees by band, free above a threshold."""

from rest_framework.exceptions import ValidationError

from .locations import LAGOS_LGAS, NIGERIAN_STATES
from .models import DeliverySettings

WITHIN = "lagos_within"
CROSS = "lagos_cross"
OUTSIDE = "outside_lagos"


def delivery_settings():
    return DeliverySettings.objects.get(pk=1)


def band_for(state, lga, settings):
    if state not in NIGERIAN_STATES:
        raise ValidationError({"shipping": {"state": "Choose a Nigerian state."}})
    if state != "Lagos":
        return OUTSIDE
    side = LAGOS_LGAS.get(lga)
    if side is None:
        raise ValidationError({"shipping": {"lga": "Choose a Lagos LGA."}})
    return WITHIN if side == settings.origin_side else CROSS


def fee_for(band, subtotal, settings):
    """Free delivery keys on the subtotal before any promo discount."""
    threshold = settings.free_delivery_threshold
    if threshold is not None and subtotal >= threshold:
        return 0
    return {
        WITHIN: settings.lagos_within_fee,
        CROSS: settings.lagos_cross_fee,
        OUTSIDE: settings.outside_lagos_fee,
    }[band]


def public_delivery_info(settings):
    return {
        "fees": {
            WITHIN: settings.lagos_within_fee,
            CROSS: settings.lagos_cross_fee,
            OUTSIDE: settings.outside_lagos_fee,
        },
        "free_delivery_threshold": settings.free_delivery_threshold,
    }
