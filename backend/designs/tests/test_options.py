from rest_framework.test import APIClient

from designs.options import PRINT_DPI, UNITS_PER_INCH


def get_options():
    return APIClient().get("/api/v1/designs/options/")


def test_options_are_public():
    assert get_options().status_code == 200


def test_options_carry_the_mockup_geometry():
    data = get_options().json()
    assert data["canvas_size"] == 1000
    center = next(p for p in data["placements"] if p["key"] == "center_chest")
    box = center["box"]
    assert box["x"] + box["w"] <= data["canvas_size"]
    assert box["y"] + box["h"] <= data["canvas_size"]


def test_defaults_name_options_that_exist():
    data = get_options().json()
    defaults = data["defaults"]
    assert defaults["placement"] in {p["key"] for p in data["placements"]}
    assert defaults["shirt_color"] in {c["name"] for c in data["shirt_colors"]}
    assert defaults["text_color"] in {c["name"] for c in data["text_colors"]}


def test_mockup_units_scale_to_300_dpi():
    assert PRINT_DPI / UNITS_PER_INCH == 10


def test_shirt_colors_are_exactly_the_seven_the_prd_names():
    names = [c["name"] for c in get_options().json()["shirt_colors"]]
    assert names == [
        "Black",
        "White",
        "Navy",
        "Charcoal",
        "Maroon",
        "Forest Green",
        "Deep Purple",
    ]


def test_every_shirt_color_has_a_hex_value():
    for color in get_options().json()["shirt_colors"]:
        assert len(color["hex"]) == 7 and color["hex"].startswith("#")
