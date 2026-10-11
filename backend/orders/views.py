from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from config.permissions import IsStaffUser
from config.throttling import scoped

from . import paystack
from .checkout import cart_lines, guest_lines, quote
from .delivery import delivery_settings, public_delivery_info
from .history import OrderPagination
from .locations import LAGOS_LGAS, NIGERIAN_STATES
from .models import CheckoutSession, DeliverySettings, Order, OrderItem
from .payments import AmountMismatch, open_session, release, settle
from .serializers import (
    CheckoutRequestSerializer,
    QuoteRequestSerializer,
    order_payload,
    quote_payload,
)


@api_view(["GET"])
@permission_classes([AllowAny])
def checkout_options(request):
    """The state and Lagos LGA lists the shipping form offers (D-083)."""
    return Response({"states": list(NIGERIAN_STATES), "lagos_lgas": sorted(LAGOS_LGAS)})


def lines_for(request, data):
    if request.user.is_authenticated:
        return cart_lines(request.user)
    return guest_lines(data.get("items", []))


@api_view(["POST"])
@permission_classes([AllowAny])
def checkout_quote(request):
    """What the order will cost, computed entirely server-side (SEC-06)."""
    serializer = QuoteRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data
    user = request.user if request.user.is_authenticated else None
    email = user.email if user else data["email"]
    result = quote(
        lines_for(request, data),
        data.get("shipping"),
        promo_code=data["promo_code"],
        user=user,
        email=email,
    )
    return Response(quote_payload(result))


@api_view(["GET"])
@permission_classes([AllowAny])
def delivery_info(request):
    """Band fees and the free-delivery threshold, for the bag's estimate."""
    return Response(public_delivery_info(delivery_settings()))


class DeliverySettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliverySettings
        exclude = ["id"]
        read_only_fields = ["updated_at"]

    def validate(self, attrs):
        merged = {**self.instance.__dict__, **attrs} if self.instance else attrs
        for area in ("lagos", "outside"):
            if merged[f"{area}_days_min"] > merged[f"{area}_days_max"]:
                raise serializers.ValidationError(
                    {f"{area}_days_min": "Must not exceed the maximum."}
                )
        return attrs


@api_view(["GET", "PATCH"])
@permission_classes([IsStaffUser])
def admin_delivery_settings(request):
    """FR-CART-08: the admin configures the band fees and threshold."""
    settings = delivery_settings()
    if request.method == "PATCH":
        serializer = DeliverySettingsSerializer(
            settings, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
    return Response(DeliverySettingsSerializer(settings).data)


def payments_unavailable():
    return Response(
        {"detail": "Payments aren't available right now. Please try again later."},
        status=status.HTTP_503_SERVICE_UNAVAILABLE,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def checkout_start(request):
    """FR-CART-06: freeze the server's quote and hand the browser exactly
    what Paystack Inline needs. Nothing here trusts a client figure."""
    if not paystack.configured():
        return payments_unavailable()
    serializer = CheckoutRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data
    user = request.user if request.user.is_authenticated else None
    email = user.email if user else data["email"]
    if not email:
        raise ValidationError({"email": "Enter an email for your receipt."})
    session = open_session(
        lines_for(request, data), data["shipping"], email, user, data["promo_code"]
    )
    return Response(
        {
            "reference": session.reference,
            "amount": session.total,
            "email": session.email,
            "public_key": settings.PAYSTACK_PUBLIC_KEY,
            "channels": paystack.CHANNELS,
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def checkout_cancel(request):
    """Called when the popup is cancelled or errors, so an unpaid checkout
    stops holding its promo code's use (T-422)."""
    reference = str(request.data.get("reference", ""))
    get_object_or_404(CheckoutSession, reference=reference)
    release(reference)
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["POST"])
@permission_classes([AllowAny])
def checkout_verify(request):
    """After the popup reports success, ask Paystack itself. Only its answer
    (status, amount and currency) settles the session."""
    if not paystack.configured():
        return payments_unavailable()
    reference = str(request.data.get("reference", ""))
    session = get_object_or_404(CheckoutSession, reference=reference)
    if session.status != CheckoutSession.Status.PAID:
        try:
            session, _ = settle(reference, paystack.verify_transaction(reference))
        except paystack.PaystackError:
            return Response(
                {"detail": "We couldn't confirm your payment yet. Please try again."},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except AmountMismatch:
            return Response(
                {"detail": "That payment doesn't match this order. Contact us."},
                status=status.HTTP_409_CONFLICT,
            )
    if session.status != CheckoutSession.Status.PAID:
        return Response(
            {"detail": "Payment didn't go through; you weren't charged. Try again."},
            status=status.HTTP_402_PAYMENT_REQUIRED,
        )
    order = session.order
    return Response(
        {
            "reference": session.reference,
            "status": session.status,
            "order_number": order.order_number if order else None,
            "tracking_token": order.tracking_token if order else None,
        }
    )


@api_view(["GET"])
@permission_classes([IsStaffUser])
def order_item_design_file(request, pk):
    """SEC-15: an ordered custom shirt's print file, staff only (M5's order
    detail links here)."""
    from django.http import FileResponse, Http404

    from designs.storage import design_storage, order_item_file_name

    item = get_object_or_404(OrderItem, pk=pk, saved_design__isnull=False)
    storage, name = design_storage(), order_item_file_name(item.id)
    if not storage.exists(name):
        raise Http404
    return FileResponse(
        storage.open(name, "rb"),
        content_type="image/png",
        as_attachment=True,
        filename=f"{item.order.order_number}-{item.id}.png",
    )


@api_view(["GET"])
@permission_classes([AllowAny])
@throttle_classes([ScopedRateThrottle])
@scoped("order-track")
def order_track(request, token):
    """SEC-13: the guest's link is the unguessable token; the sequential
    order number alone opens nothing."""
    order = get_object_or_404(
        Order.objects.prefetch_related("items__product"), tracking_token=token
    )
    return Response(order_payload(order, delivery_settings()))


@api_view(["GET"])
@permission_classes([AllowAny])
def order_item_preview(request, token, item_id):
    """The email's design thumbnail. The tracking token is the credential,
    as for the tracking page, so a guessed item id alone opens nothing."""
    from django.http import FileResponse, Http404

    from designs.storage import design_storage, order_item_preview_name

    item = get_object_or_404(
        OrderItem, pk=item_id, order__tracking_token=token, design_config__isnull=False
    )
    storage, name = design_storage(), order_item_preview_name(item.id)
    if not storage.exists(name):
        raise Http404
    response = FileResponse(storage.open(name, "rb"), content_type="image/png")
    response["Cache-Control"] = "private, max-age=86400"
    return response


@api_view(["GET"])
def order_history(request):
    """FR-USR-03: the signed-in customer's orders, newest first. Only the
    owner's, so the address can be included (SEC-14)."""
    orders = (
        Order.objects.filter(user=request.user)
        .order_by("-created_at")
        .prefetch_related("items__product")
    )
    paginator = OrderPagination()
    page = paginator.paginate_queryset(orders, request)
    delivery = delivery_settings()
    return paginator.get_paginated_response(
        [order_payload(order, delivery, include_shipping=True) for order in page]
    )


def _tracked(token):
    return get_object_or_404(Order, tracking_token=token)


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([ScopedRateThrottle])
@scoped("order-track")
def order_refund_request(request, token):
    """FR-NOT-03: after a rejection the customer may ask for a refund."""
    from .moderation import request_refund

    request_refund(_tracked(token).pk)
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([ScopedRateThrottle])
@scoped("order-track")
def order_item_revise(request, token, item_id):
    """FR-NOT-03: the customer's revised design goes back for review."""
    from .moderation import revise_design

    revise_design(_tracked(token).pk, item_id, request.data.get("config"))
    return Response(status=status.HTTP_204_NO_CONTENT)
