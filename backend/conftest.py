import pytest


@pytest.fixture(autouse=True)
def celery_eager(settings):
    """Tasks run synchronously in-process for tests -- no broker required,
    and a task's side effects are observable immediately after .delay()."""
    settings.CELERY_TASK_ALWAYS_EAGER = True
    settings.CELERY_TASK_EAGER_PROPAGATES = True
