from django.db import migrations
from django.db.models import Avg, Count, Q


def backfill(apps, schema_editor):
    Product = apps.get_model("catalog", "Product")
    visible = Q(reviews__is_visible=True)
    for product in Product.objects.annotate(
        n=Count("reviews", filter=visible), a=Avg("reviews__rating", filter=visible)
    ):
        product.review_count = product.n
        product.avg_rating = round(product.a or 0, 2)
        product.save(update_fields=["review_count", "avg_rating"])


class Migration(migrations.Migration):
    dependencies = [("catalog", "0003_product_review_count"), ("reviews", "0003_review_moderation")]

    operations = [migrations.RunPython(backfill, migrations.RunPython.noop)]
