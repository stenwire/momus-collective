"""The one place a custom design's price is computed (DRY-03)."""

from .models import CustomPricing, ShirtBlank


def price_list():
    """Price per shirt colour in kobo: blank + print + margin. Two queries
    however many colours, so list endpoints stay constant (EFF-01)."""
    pricing = CustomPricing.objects.get(pk=1)
    return {
        blank.color: blank.blank_cost + pricing.print_cost + pricing.margin
        for blank in ShirtBlank.objects.all()
    }


def custom_design_price(shirt_color):
    return price_list()[shirt_color]
