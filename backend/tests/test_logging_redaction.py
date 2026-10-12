import logging

import pytest
from django.conf import settings
from rest_framework.test import APIClient

from config.logging import RedactPII, redact

pytestmark = pytest.mark.django_db


@pytest.mark.parametrize(
    "raw,clean",
    [
        (
            "Not Found: /api/v1/orders/track/Hf9IUHKIZ9Sau5dVjdQFr_si/",
            "Not Found: /api/v1/orders/track/[token]/",
        ),
        ("GET /track/abc123?revised=1", "GET /track/[token]?revised=1"),
        (
            "/product/naps?review=Hf9IUH_x-1#reviews",
            "/product/naps?review=[token]#reviews",
        ),
        (
            "/newsletter/unsubscribe?token=IjMx:1xG:2qy",
            "/newsletter/unsubscribe?token=[token]",
        ),
        ("sent to Ada.Obi+shop@mail.example.com.ng", "sent to [email]"),
        ("call +2348012345678 or 08012345678", "call [phone] or [phone]"),
        (
            "order MOM-20261011-001 total 2750000",
            "order MOM-20261011-001 total 2750000",
        ),
    ],
)
def test_redaction(raw, clean):
    assert redact(raw) == clean


def test_every_handler_redacts():
    handlers = settings.LOGGING["handlers"]
    assert handlers and all("redact" in h["filters"] for h in handlers.values())
    assert settings.LOGGING["filters"]["redact"]["()"] is RedactPII


def test_formatted_arguments_are_redacted_too():
    record = logging.LogRecord(
        "x",
        logging.INFO,
        "",
        0,
        "email %s phone %s",
        ("a@b.co", "+2348012345678"),
        None,
    )
    RedactPII().filter(record)
    assert record.getMessage() == "email [email] phone [phone]"


def test_a_404_on_a_tracking_link_logs_no_token(caplog):
    logging.getLogger("django.request").addFilter(RedactPII())
    try:
        with caplog.at_level(logging.WARNING, logger="django.request"):
            APIClient().get("/api/v1/orders/track/SECRET-TOKEN-123/")
    finally:
        logging.getLogger("django.request").removeFilter(
            logging.getLogger("django.request").filters[-1]
        )
    text = caplog.text
    assert "SECRET-TOKEN-123" not in text and "/track/[token]/" in text
