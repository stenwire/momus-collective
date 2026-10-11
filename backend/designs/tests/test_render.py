import io
import re
from pathlib import Path

import pytest
from PIL import Image

from designs import options, render
from designs.render import render_design_png

CONFIG = {
    "shirt_color": "Black",
    "text": "DRESSED UP\nFILTERED OUT",
    "font": "archivo_black",
    "font_size": "large",
    "text_color": "Gold",
    "alignment": "center",
    "letter_spacing": "normal",
    "placement": "center_chest",
}


def open_png(config=CONFIG):
    return Image.open(io.BytesIO(render_design_png(config)))


def opaque_pixels(image):
    return sum(1 for a in image.getchannel("A").get_flattened_data() if a > 0)


def test_print_file_is_at_least_300_dpi():
    image = open_png()
    assert image.format == "PNG"
    dpi_x, dpi_y = image.info["dpi"]
    assert round(dpi_x) >= 300 and round(dpi_y) >= 300


@pytest.mark.parametrize("key", list(options.PLACEMENTS))
def test_pixel_size_is_the_print_area_at_300_dpi(key):
    image = open_png({**CONFIG, "placement": key})
    box = options.PLACEMENTS[key]["box"]
    inches_w = box["w"] / options.UNITS_PER_INCH
    inches_h = box["h"] / options.UNITS_PER_INCH
    assert image.size == (round(inches_w * 300), round(inches_h * 300))


def test_background_is_transparent_and_only_text_is_inked():
    image = open_png()
    assert image.mode == "RGBA"
    w, h = image.size
    for corner in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        assert image.getpixel(corner)[3] == 0
    inked = opaque_pixels(image)
    assert 0 < inked < w * h * 0.5


def test_text_is_drawn_in_the_chosen_colour():
    image = open_png()
    solid = [p for p in image.get_flattened_data() if p[3] == 255]
    gold = tuple(int(options.TEXT_COLORS["Gold"][i : i + 2], 16) for i in (1, 3, 5))
    assert solid and all(p[:3] == gold for p in solid)


def test_no_shirt_is_drawn_into_the_print_file():
    black_shirt = open_png({**CONFIG, "shirt_color": "Black"})
    navy_shirt = open_png({**CONFIG, "shirt_color": "Navy"})
    assert black_shirt.tobytes() == navy_shirt.tobytes()


def test_text_is_sanitized_before_it_reaches_the_file():
    clean = render_design_png({**CONFIG, "text": "MOMUS"})
    dirty = render_design_png({**CONFIG, "text": "MO‮MU​S\u0007"})
    assert clean == dirty


def test_fonts_render_differently():
    a = open_png({**CONFIG, "font": "anton"}).tobytes()
    b = open_png({**CONFIG, "font": "pacifico"}).tobytes()
    assert a != b


def test_parenthetical_line_is_set_at_half_size():
    lines = render.layout(
        "MAIN\n(aside)", 3300, 2400, "archivo_black", 400, 0, "center"
    )
    assert lines[1]["px"] == lines[0]["px"] * 0.5


def test_long_text_shrinks_to_fit_the_print_area():
    text = "x" * 20 + "\n" + "y" * 20 + "\n" + "z" * 20 + "\n" + "w" * 20
    lines = render.layout(text, 3000, 1200, "anton", 3000 * 0.22, 0.2, "left")
    assert sum(line["px"] * render.LINE_HEIGHT for line in lines) <= 1200
    assert all(line["width"] <= 3000 for line in lines)


def test_layout_constants_mirror_the_frontend():
    # D-067: the preview and the print file share one algorithm.
    source = (
        Path(__file__).resolve().parents[3] / "frontend/src/lib/design/layout.ts"
    ).read_text()
    for name in [
        "LINE_HEIGHT",
        "BASELINE",
        "PARENTHETICAL_SCALE",
        "SHRINK",
        "MAX_SHRINKS",
    ]:
        match = re.search(rf"const {name} = ([\d.]+);", source)
        assert match, name
        assert float(match.group(1)) == getattr(render, name), name
