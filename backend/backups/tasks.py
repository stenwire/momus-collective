from celery import shared_task

from .services import backup_assets, backup_database


@shared_task
def daily_database_backup():
    return backup_database()


@shared_task
def weekly_asset_backup():
    return backup_assets()[0]
