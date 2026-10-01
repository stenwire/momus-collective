import pytest
from django.core.cache import cache


@pytest.fixture(autouse=True)
def celery_eager(settings):
    """Tasks run synchronously in-process for tests -- no broker required,
    and a task's side effects are observable immediately after .delay()."""
    settings.CELERY_TASK_ALWAYS_EAGER = True
    settings.CELERY_TASK_EAGER_PROPAGATES = True


@pytest.fixture(autouse=True)
def isolated_throttle_cache(settings):
    """DRF's rate throttles persist counters in the cache keyed by client
    IP; every test client shares one IP, so without isolation and a reset
    per test, throttle state leaks across tests and order affects results."""
    settings.CACHES = {
        "default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}
    }
    cache.clear()
    yield
    cache.clear()
