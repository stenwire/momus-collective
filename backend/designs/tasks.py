from celery import shared_task
from django.conf import settings
from django.core.files.base import ContentFile

from .render import render_design_png
from .storage import design_file_name, design_storage, discard_design_file


@shared_task
def generate_design_file(design_id):
    from carts.models import SavedDesign

    design = SavedDesign.objects.get(id=design_id)
    png = render_design_png(design.config)
    discard_design_file(design.id)
    design_storage().save(design_file_name(design.id), ContentFile(png))
    design.design_file_url = f"{settings.BACKEND_URL}/api/v1/designs/{design.id}/file/"
    design.save(update_fields=["design_file_url", "updated_at"])
