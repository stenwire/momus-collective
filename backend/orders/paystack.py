"""Paystack's API, server side only. The secret key never leaves here."""

import requests
from django.conf import settings

API = "https://api.paystack.co"
CHANNELS = ["card", "bank_transfer", "ussd"]


class PaystackError(Exception):
    pass


def configured():
    return bool(settings.PAYSTACK_SECRET_KEY and settings.PAYSTACK_PUBLIC_KEY)


def verify_transaction(reference):
    """Paystack's own record of a transaction: the only source of truth
    for whether money moved, never the browser's onSuccess callback."""
    try:
        resp = requests.get(
            f"{API}/transaction/verify/{reference}",
            headers={"Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}"},
            timeout=10,
        )
    except requests.RequestException as error:
        raise PaystackError("Paystack could not be reached.") from error
    body = resp.json() if resp.content else {}
    if resp.status_code != 200 or not body.get("status"):
        raise PaystackError(body.get("message", "Paystack refused the lookup."))
    return body["data"]
