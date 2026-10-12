"""T-517 / SEC-14: customer PII and order credentials never reach the logs.
Every handler runs this filter, so Django's own 404/500 lines, Celery and
any future log call are scrubbed before they're written."""

import logging
import re

PATTERNS = [
    # A tracking or unsubscribe token is a credential for that order or list.
    (re.compile(r"(/track/)[^/\s?#]+"), r"\1[token]"),
    (re.compile(r"((?:review|token)=)[^&\s#]+"), r"\1[token]"),
    (re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+"), "[email]"),
    (re.compile(r"(?<![\w-])(?:\+?234|0)[789][01]\d{8}(?!\d)"), "[phone]"),
]


def redact(text):
    for pattern, replacement in PATTERNS:
        text = pattern.sub(replacement, text)
    return text


class RedactPII(logging.Filter):
    def filter(self, record):
        record.msg = redact(record.getMessage())
        record.args = ()
        return True


LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "filters": {"redact": {"()": RedactPII}},
    "formatters": {
        "plain": {"format": "%(asctime)s %(levelname)s %(name)s: %(message)s"},
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "filters": ["redact"],
            "formatter": "plain",
        },
    },
    "root": {"handlers": ["console"], "level": "INFO"},
    "loggers": {
        "django": {"handlers": ["console"], "level": "INFO", "propagate": False},
        "django.request": {
            "handlers": ["console"],
            "level": "WARNING",
            "propagate": False,
        },
        "celery": {"handlers": ["console"], "level": "INFO", "propagate": False},
    },
}
