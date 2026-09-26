"""WSGI entrypoint. Exposes `application`. See Django's WSGI deployment docs."""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

application = get_wsgi_application()
