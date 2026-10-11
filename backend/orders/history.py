"""FR-USR-03: a customer's own orders."""

from rest_framework.pagination import PageNumberPagination

from .models import Order


class OrderPagination(PageNumberPagination):
    page_size = 10


def claim_guest_orders(user):
    """Called once the customer has proved they own the email, so orders
    placed as a guest with it appear in their history."""
    return Order.objects.filter(
        user__isnull=True, guest_email__iexact=user.email
    ).update(user=user)
