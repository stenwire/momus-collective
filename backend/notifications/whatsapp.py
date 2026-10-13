"""WhatsApp providers behind one interface (D-093). `provider()` picks one
from WHATSAPP_PROVIDER, or Termii when its key is set, else the admin bot."""

import requests
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured


class WhatsAppError(Exception):
    pass


class Provider:
    name = ""
    can_message_customers = False
    # Whether customer details may pass through it (a business API with a
    # data agreement), not a free relay.
    carries_personal_data = False

    def configured(self):
        raise NotImplementedError

    def send(self, to, text):
        raise NotImplementedError

    def send_to_admin(self, text):
        self.send(settings.ADMIN_WHATSAPP_NUMBER, text)


def _request(method, url, **kwargs):
    try:
        resp = requests.request(method, url, timeout=10, **kwargs)
    except requests.RequestException as error:
        raise WhatsAppError("WhatsApp provider could not be reached.") from error
    if resp.status_code >= 300:
        raise WhatsAppError(f"WhatsApp provider refused ({resp.status_code}).")
    return resp


class AdminBot(Provider):
    """CallMeBot: free, but it only messages the number that registered the
    key, so it serves admin alerts and never customers."""

    name = "admin_bot"
    API = "https://api.callmebot.com/whatsapp.php"

    def configured(self):
        return bool(settings.CALLMEBOT_API_KEY and settings.ADMIN_WHATSAPP_NUMBER)

    def send(self, to, text):
        _request(
            "GET",
            self.API,
            params={"phone": to, "text": text, "apikey": settings.CALLMEBOT_API_KEY},
        )


class Termii(Provider):
    """Termii's WhatsApp channel; needs an approved WhatsApp sender."""

    name = "termii"
    can_message_customers = True
    carries_personal_data = True

    def configured(self):
        return bool(settings.TERMII_API_KEY and settings.TERMII_SENDER_ID)

    def send(self, to, text):
        _request(
            "POST",
            f"{settings.TERMII_BASE_URL}/api/sms/send",
            json={
                "api_key": settings.TERMII_API_KEY,
                "to": to.lstrip("+"),
                "from": settings.TERMII_SENDER_ID,
                "sms": text,
                "type": "plain",
                "channel": "whatsapp",
            },
        )


PROVIDERS = {cls.name: cls for cls in (Termii, AdminBot)}


def provider():
    name = settings.WHATSAPP_PROVIDER or (
        Termii.name if settings.TERMII_API_KEY else AdminBot.name
    )
    if name not in PROVIDERS:
        raise ImproperlyConfigured(
            f"WHATSAPP_PROVIDER must be one of {', '.join(PROVIDERS)}."
        )
    return PROVIDERS[name]()
