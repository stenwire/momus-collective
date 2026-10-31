import io

import pytest
from PIL import Image
from rest_framework.test import APIClient

from carts.models import SavedDesign
from catalog.models import Category, Product

from .test_saved_designs import CONFIG, make_user

pytestmark = pytest.mark.django_db


def staff_client():
    user = make_user("staff@example.com")
    user.is_staff = True
    user.save()
    client = APIClient()
    client.force_authenticate(user)
    return client, user


def test_converts_a_design_to_a_draft_product(settings, tmp_path):
    settings.DESIGN_FILES_ROOT = str(tmp_path)
    client, user = staff_client()
    category = Category.objects.create(name="Tees", slug="tees")
    design = SavedDesign.objects.create(user=user, name="n", config=CONFIG)
    resp = client.post(
        f"/api/v1/admin/designs/{design.id}/convert/",
        {"category": str(category.id)},
        format="json",
    )
    assert resp.status_code == 201
    product = Product.objects.get(id=resp.json()["id"])
    assert product.is_active is False
    assert product.shirt_colors == [CONFIG["shirt_color"]]
    image = APIClient().get(f"/api/v1/mockups/{product.id}/")
    assert image.status_code == 200
    assert image["Content-Type"] == "image/png"
    picture = Image.open(io.BytesIO(b"".join(image.streaming_content))).convert("RGB")
    assert picture.getpixel((400, 600)) == (11, 11, 12)  # shirt body
    assert picture.getpixel((5, 5)) != picture.getpixel((400, 600))  # backdrop


def test_conversion_is_staff_only():
    user = make_user("shopper@example.com")
    client = APIClient()
    client.force_authenticate(user)
    design = SavedDesign.objects.create(user=user, name="n", config=CONFIG)
    assert client.post(f"/api/v1/admin/designs/{design.id}/convert/").status_code == 403
