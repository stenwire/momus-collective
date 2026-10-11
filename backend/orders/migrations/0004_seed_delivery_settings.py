from django.db import migrations


def seed(apps, schema_editor):
    # Placeholder values in kobo (D-084): the admin sets the real ones.
    apps.get_model("orders", "DeliverySettings").objects.get_or_create(
        pk=1,
        defaults={
            "lagos_within_fee": 200000,
            "lagos_cross_fee": 300000,
            "outside_lagos_fee": 500000,
            "free_delivery_threshold": 2500000,
            "origin_side": "mainland",
            "lagos_days_min": 1,
            "lagos_days_max": 3,
            "outside_days_min": 3,
            "outside_days_max": 7,
        },
    )


def unseed(apps, schema_editor):
    apps.get_model("orders", "DeliverySettings").objects.all().delete()


class Migration(migrations.Migration):
    dependencies = [("orders", "0003_delivery_settings")]

    operations = [migrations.RunPython(seed, unseed)]
