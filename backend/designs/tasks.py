from celery import shared_task
from django.conf import settings
from django.core.files.base import ContentFile
from django.utils import timezone

from .render import render_design_png
from .storage import design_file_name, design_storage, order_item_file_name


@shared_task
def generate_design_file(design_id):
    from carts.models import SavedDesign

    design = SavedDesign.objects.filter(id=design_id).first()
    if design is None:
        return
    config = design.config
    storage, name = design_storage(), design_file_name(design.id, config)
    if storage.exists(name):
        storage.delete(name)
    storage.save(name, ContentFile(render_design_png(config)))
    # Publish only if the design still has the config just rendered.
    published = SavedDesign.objects.filter(id=design.id, config=config).update(
        design_file_url=f"{settings.BACKEND_URL}/api/v1/designs/{design.id}/file/",
        updated_at=timezone.now(),
    )
    if not published:
        storage.delete(name)


@shared_task
def render_order_item_file(item_id, config):
    """The print file for one ordered custom shirt, from the config frozen
    at checkout, so later edits to the saved design can't change it."""
    storage, name = design_storage(), order_item_file_name(item_id)
    if not storage.exists(name):
        storage.save(name, ContentFile(render_design_png(config)))
