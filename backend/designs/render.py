"""Print-file renderer (FR-DES-09). Mirrors frontend/src/lib/design/layout.ts
so the file matches the preview; change both or neither (D-067)."""

import io
from functools import lru_cache
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from . import options
from .sanitize import sanitize_design_text

LINE_HEIGHT = 1.2
BASELINE = 0.85
PARENTHETICAL_SCALE = 0.5
SHRINK = 0.9
MAX_SHRINKS = 30

FONTS_DIR = Path(__file__).resolve().parent / "fonts"
SCALE = options.PRINT_DPI / options.UNITS_PER_INCH


@lru_cache(maxsize=256)
def _font(key, px):
    return ImageFont.truetype(str(FONTS_DIR / options.FONTS[key]["file"]), px)


def _text_width(text, font, px, spacing_em):
    advance = sum(font.getlength(ch) for ch in text)
    return advance + spacing_em * px * max(len(text) - 1, 0)


def _wrap(paragraph, font, px, spacing_em, max_width):
    def fits(s):
        return _text_width(s, font, px, spacing_em) <= max_width

    lines, current = [], ""
    for word in [w for w in paragraph.split(" ") if w]:
        candidate = f"{current} {word}" if current else word
        if fits(candidate):
            current = candidate
            continue
        if current:
            lines.append(current)
        current = ""
        for ch in word:
            if current and not fits(current + ch):
                lines.append(current)
                current = ""
            current += ch
    if current or not lines:
        lines.append(current)
    return lines


def _wrap_all(text, font_key, font_px, spacing_em, max_width):
    lines = []
    for paragraph in text.split("\n"):
        trimmed = paragraph.strip()
        aside = len(trimmed) > 1 and trimmed[0] == "(" and trimmed[-1] == ")"
        px = font_px * PARENTHETICAL_SCALE if aside else font_px
        font = _font(font_key, px)
        for line in _wrap(paragraph, font, px, spacing_em, max_width):
            width = _text_width(line, font, px, spacing_em)
            lines.append({"text": line, "px": px, "font": font, "width": width})
    return lines


def layout(text, box_w, box_h, font_key, font_px, spacing_em, align):
    if not text.strip():
        return []
    lines = _wrap_all(text, font_key, font_px, spacing_em, box_w)
    for _ in range(MAX_SHRINKS):
        height = sum(line["px"] * LINE_HEIGHT for line in lines)
        if height <= box_h and all(line["width"] <= box_w for line in lines):
            break
        font_px *= SHRINK
        lines = _wrap_all(text, font_key, font_px, spacing_em, box_w)

    height = sum(line["px"] * LINE_HEIGHT for line in lines)
    top = (box_h - height) / 2
    for line in lines:
        slot = line["px"] * LINE_HEIGHT
        if align == "left":
            line["x"] = 0
        elif align == "right":
            line["x"] = box_w - line["width"]
        else:
            line["x"] = (box_w - line["width"]) / 2
        line["baseline"] = top + slot * BASELINE
        top += slot
    return lines


def render_design_png(config):
    """Text only on a transparent canvas the size of the placement's print
    area at PRINT_DPI. Text is re-sanitized here whatever its source."""
    box = options.PLACEMENTS[config["placement"]]["box"]
    width, height = round(box["w"] * SCALE), round(box["h"] * SCALE)
    spacing_em = options.LETTER_SPACINGS[config["letter_spacing"]]["em"]
    font_px = width * options.FONT_SIZES[config["font_size"]]["ratio"]
    text = sanitize_design_text(config["text"])
    color = options.TEXT_COLORS[config["text_color"]]

    image = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    lines = layout(
        text, width, height, config["font"], font_px, spacing_em, config["alignment"]
    )
    for line in lines:
        x = line["x"]
        for ch in line["text"]:
            draw.text(
                (x, line["baseline"]), ch, font=line["font"], fill=color, anchor="ls"
            )
            x += line["font"].getlength(ch) + spacing_em * line["px"]

    buffer = io.BytesIO()
    image.save(buffer, format="PNG", dpi=(options.PRINT_DPI, options.PRINT_DPI))
    return buffer.getvalue()


def render_preview_png(config, size=240):
    """A small shirt-coloured thumbnail with the print area in place, for
    emails, which can't run the canvas preview."""
    scale = size / options.CANVAS_SIZE
    box = options.PLACEMENTS[config["placement"]]["box"]
    text = Image.open(io.BytesIO(render_design_png(config)))
    text = text.resize(
        (max(1, round(box["w"] * scale)), max(1, round(box["h"] * scale))),
        Image.LANCZOS,
    )
    image = Image.new("RGB", (size, size), options.SHIRT_COLORS[config["shirt_color"]])
    image.paste(text, (round(box["x"] * scale), round(box["y"] * scale)), text)
    buffer = io.BytesIO()
    image.save(buffer, format="PNG", optimize=True)
    return buffer.getvalue()


SHIRT_POINTS = [
    (400, 120), (250, 165), (110, 300), (190, 400), (275, 355), (275, 900),
    (725, 900), (725, 355), (810, 400), (890, 300), (750, 165), (600, 120),
]  # fmt: skip
MOCKUP_BACKGROUND = "#151413"
MOCKUP_OUTLINE = (128, 128, 128)
SUPERSAMPLE = 2


def _quad(p0, p1, p2, steps=24):
    return [
        (
            (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t**2 * p2[0],
            (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t**2 * p2[1],
        )
        for t in (i / steps for i in range(1, steps + 1))
    ]


def render_mockup_png(config, size=800):
    """Product photo: the design printed on the shirt silhouette, matching
    the storefront canvas preview."""
    big = size * SUPERSAMPLE
    scale = big / options.CANVAS_SIZE
    shirt = [*SHIRT_POINTS, *_quad((600, 120), (500, 200), (400, 120))]
    collar = [(400, 120), *_quad((400, 120), (500, 225), (600, 120))]
    collar += _quad((600, 120), (500, 200), (400, 120))

    def scaled(points):
        return [(x * scale, y * scale) for x, y in points]

    image = Image.new("RGB", (big, big), MOCKUP_BACKGROUND)
    draw = ImageDraw.Draw(image, "RGBA")
    draw.polygon(
        scaled(shirt),
        fill=options.SHIRT_COLORS[config["shirt_color"]],
        outline=MOCKUP_OUTLINE,
        width=3 * SUPERSAMPLE,
    )
    draw.polygon(scaled(collar), fill=(0, 0, 0, 64))

    box = options.PLACEMENTS[config["placement"]]["box"]
    text = Image.open(io.BytesIO(render_design_png(config)))
    text = text.resize(
        (max(1, round(box["w"] * scale)), max(1, round(box["h"] * scale))),
        Image.LANCZOS,
    )
    image.paste(text, (round(box["x"] * scale), round(box["y"] * scale)), text)
    image = image.resize((size, size), Image.LANCZOS)
    buffer = io.BytesIO()
    image.save(buffer, format="PNG", optimize=True)
    return buffer.getvalue()
