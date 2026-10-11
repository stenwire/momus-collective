from django.db import migrations

# Placeholder costs in kobo (D-076): the admin sets the real ones.
BLANK_COSTS = {
    "Black": 350000,
    "White": 350000,
    "Navy": 400000,
    "Charcoal": 400000,
    "Maroon": 400000,
    "Forest Green": 400000,
    "Deep Purple": 400000,
}
PRINT_COST = 400000
MARGIN = 500000


def seed(apps, schema_editor):
    ShirtBlank = apps.get_model("designs", "ShirtBlank")
    CustomPricing = apps.get_model("designs", "CustomPricing")
    for color, cost in BLANK_COSTS.items():
        ShirtBlank.objects.get_or_create(color=color, defaults={"blank_cost": cost})
    CustomPricing.objects.get_or_create(
        pk=1, defaults={"print_cost": PRINT_COST, "margin": MARGIN}
    )


def unseed(apps, schema_editor):
    apps.get_model("designs", "ShirtBlank").objects.all().delete()
    apps.get_model("designs", "CustomPricing").objects.all().delete()


class Migration(migrations.Migration):
    dependencies = [("designs", "0001_custom_pricing")]

    operations = [migrations.RunPython(seed, unseed)]
