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

from .tasks import settle_charge


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
    anything is parsed or any order state is read or written (SEC-01/02).
    A broker outage is a 500, so Paystack retries the event."""
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
    # EFF-07: settled off the request path. Only what settle reads is
    # queued; the payload's customer details never reach the broker.
    settle_charge.delay(
        {k: data.get(k) for k in ("reference", "status", "amount", "currency")}
    )
    return Response(status=200)
