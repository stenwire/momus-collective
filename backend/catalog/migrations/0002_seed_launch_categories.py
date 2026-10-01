from django.db import migrations
from django.utils.text import slugify

# Exact order and names from the PRD's FR-CAT-02 launch category list.
LAUNCH_CATEGORIES = [
    "Philosophy",
    "Self-Aware",
    "Tech",
    "Geopolitics",
    "Pop Culture",
    "Dad Jokes",
    "Engineering",
    "Relationships",
    "Religion",
    "Hot Takes",
    "Chaotic",
]


def seed_categories(apps, schema_editor):
    Category = apps.get_model("catalog", "Category")
    for order, name in enumerate(LAUNCH_CATEGORIES):
        Category.objects.get_or_create(
            slug=slugify(name), defaults={"name": name, "display_order": order}
        )


def remove_categories(apps, schema_editor):
    Category = apps.get_model("catalog", "Category")
    slugs = [slugify(name) for name in LAUNCH_CATEGORIES]
    Category.objects.filter(slug__in=slugs).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("catalog", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_categories, remove_categories),
    ]
