from celery import shared_task

from .new_drops import send_new_drops


@shared_task
def weekly_new_drops():
    return send_new_drops()
