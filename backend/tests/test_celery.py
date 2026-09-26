from django.conf import settings

from config.celery import app, ping


def test_celery_app_uses_the_redis_broker():
    assert app.conf.broker_url == settings.REDIS_URL
    assert app.conf.result_backend == settings.REDIS_URL


def test_ping_task_is_registered():
    assert "config.celery.ping" in app.tasks


def test_ping_runs_eagerly_without_a_broker():
    """Executes the task body; the live broker round-trip is proved in T-011."""
    assert ping.apply().get() == "pong"
