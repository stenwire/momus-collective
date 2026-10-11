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


def test_offers_eight_to_ten_fonts_covering_every_named_style():
    fonts = get_options().json()["fonts"]
    assert 8 <= len(fonts) <= 10
    styles = {f["style"] for f in fonts}
    assert {
        "bold_sans",
        "condensed",
        "script",
        "monospace",
        "serif",
        "stencil",
    } <= styles


def test_default_font_is_the_bold_sans():
    data = get_options().json()
    default = next(f for f in data["fonts"] if f["key"] == data["defaults"]["font"])
    assert default["style"] == "bold_sans"


def test_every_font_file_ships_and_loads():
    from pathlib import Path

    from PIL import ImageFont

    from designs.options import FONTS

    fonts_dir = Path(__file__).resolve().parent.parent / "fonts"
    for font in FONTS.values():
        loaded = ImageFont.truetype(str(fonts_dir / font["file"]), 48)
        assert loaded.getlength("momus") > 0


def test_text_palette_has_eight_to_ten_colours():
    assert 8 <= len(get_options().json()["text_colors"]) <= 10


def test_each_shirt_offers_only_text_colours_that_contrast_with_it():
    from designs.options import (
        MIN_TEXT_CONTRAST,
        SHIRT_COLORS,
        TEXT_COLORS,
        contrast_ratio,
    )

    by_shirt = get_options().json()["text_colors_by_shirt"]
    assert set(by_shirt) == set(SHIRT_COLORS)
    for shirt, allowed in by_shirt.items():
        assert len(allowed) >= 4, shirt
        for name in allowed:
            ratio = contrast_ratio(SHIRT_COLORS[shirt], TEXT_COLORS[name])
            assert ratio >= MIN_TEXT_CONTRAST


def test_black_text_is_never_offered_on_a_black_shirt():
    by_shirt = get_options().json()["text_colors_by_shirt"]
    assert "Ink Black" not in by_shirt["Black"]
    assert "Off White" not in by_shirt["White"]


def test_contrast_ratio_matches_wcag_reference_values():
    from designs.options import contrast_ratio

    assert round(contrast_ratio("#000000", "#ffffff"), 1) == 21.0
    assert contrast_ratio("#777777", "#777777") == 1.0


def test_styling_options_are_exactly_the_prd_sets():
    data = get_options().json()
    labels = lambda key: [o["label"] for o in data[key]]  # noqa: E731
    assert labels("font_sizes") == ["Small", "Medium", "Large", "Extra Large"]
    assert labels("alignments") == ["Center", "Left", "Right"]
    assert labels("letter_spacings") == ["Normal", "Wide", "Extra Wide"]


def test_default_text_colour_contrasts_with_the_default_shirt():
    data = get_options().json()
    defaults = data["defaults"]
    assert (
        defaults["text_color"] in data["text_colors_by_shirt"][defaults["shirt_color"]]
    )


def test_placements_are_exactly_the_four_front_presets():
    data = get_options().json()
    assert [p["label"] for p in data["placements"]] == [
        "Upper Chest",
        "Center Chest",
        "Lower Chest",
        "Full Front",
    ]
    assert data["defaults"]["placement"] == "center_chest"


def test_no_back_or_free_drag_placement_exists():
    keys = {p["key"] for p in get_options().json()["placements"]}
    assert not any("back" in k or "drag" in k or "free" in k for k in keys)


def test_every_print_area_sits_on_the_shirt_body():
    # Body spans x 275-725 below the 200-unit neckline, hem at 900.
    for placement in get_options().json()["placements"]:
        box = placement["box"]
        assert 275 <= box["x"] and box["x"] + box["w"] <= 725, placement["key"]
        assert 200 <= box["y"] and box["y"] + box["h"] <= 900, placement["key"]


def test_print_areas_are_whole_inches():
    for placement in get_options().json()["placements"]:
        box = placement["box"]
        assert box["w"] % UNITS_PER_INCH == 0 and box["h"] % UNITS_PER_INCH == 0
