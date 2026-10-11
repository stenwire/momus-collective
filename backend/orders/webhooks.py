import hashlib
import hmac
import json

from django.conf import settings
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes,
)
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import CheckoutSession
from .payments import AmountMismatch, settle


def signature_valid(raw_body, signature):
    """HMAC-SHA512 of the exact bytes received, compared in constant time.
    No secret configured means nothing can be valid (D-008)."""
    secret = settings.PAYSTACK_SECRET_KEY
    if not secret or not signature:
        return False
    expected = hmac.new(secret.encode(), raw_body, hashlib.sha512).hexdigest()
    return hmac.compare_digest(expected, signature)


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def paystack_webhook(request):
    """FR-CART-06. The signature is checked against the raw body before
    anything is parsed or any order state is read or written (SEC-01/02)."""
    raw = request._request.body
    if not signature_valid(raw, request.headers.get("x-paystack-signature", "")):
        return Response({"detail": "Invalid signature."}, status=401)
    try:
        event = json.loads(raw)
    except ValueError:
        return Response(status=400)
    data = event.get("data") or {}
    if event.get("event") != "charge.success":
        return Response(status=200)
    reference = data.get("reference", "")
    if not CheckoutSession.objects.filter(reference=reference).exists():
        return Response(status=200)
    try:
        settle(reference, data)
    except AmountMismatch:
        # Acknowledged so Paystack stops retrying; never marked paid.
        return Response(status=200)
    return Response(status=200)
