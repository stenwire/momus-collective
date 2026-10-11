"""Sends Django mail through Resend's HTTP API (PRD: Email via Resend)."""

import requests
from django.conf import settings
from django.core.mail.backends.base import BaseEmailBackend

API = "https://api.resend.com/emails"


class EmailNotSent(Exception):
    pass


class ResendEmailBackend(BaseEmailBackend):
    def __init__(self, fail_silently=False, **kwargs):
        super().__init__(**kwargs)
        self.fail_silently = fail_silently

    def send_messages(self, email_messages):
        sent = 0
        for message in email_messages:
            try:
                self._send(message)
                sent += 1
            except EmailNotSent:
                if not self.fail_silently:
                    raise
        return sent

    def _send(self, message):
        payload = {
            "from": message.from_email,
            "to": message.to,
            "subject": message.subject,
            "text": message.body,
        }
        for content, mimetype in getattr(message, "alternatives", []):
            if mimetype == "text/html":
                payload["html"] = content
        try:
            resp = requests.post(
                API,
                json=payload,
                headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
                timeout=10,
            )
        except requests.RequestException as error:
            raise EmailNotSent("Resend could not be reached.") from error
        if resp.status_code >= 300:
            raise EmailNotSent(f"Resend refused the message ({resp.status_code}).")
