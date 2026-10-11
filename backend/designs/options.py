"""Single source for every design-tool option (DRY-06). The frontend reads
these from the options endpoint; the validator and renderer import them."""

# Mockup units are 30 per inch, so a placement box in units maps to a
# print file at exactly 300 DPI by scaling it 10x.
CANVAS_SIZE = 1000
UNITS_PER_INCH = 30
PRINT_DPI = 300

PLACEMENTS = {
    "center_chest": {
        "label": "Center Chest",
        "box": {"x": 335, "y": 300, "w": 330, "h": 240},
    },
}

# FR-DES-03 caps text at 80 characters. Four lines is the most a chest
# print stays legible at; the PRD names no line limit (D-068).
TEXT_LIMITS = {"max_length": 80, "max_lines": 4}

# FR-DES-04: 8-10 apparel fonts covering the six named styles. Files live
# in designs/fonts/ with their licenses; the frontend loads the same
# families through next/font.
FONTS = {
    "archivo_black": {
        "label": "Archivo Black",
        "style": "bold_sans",
        "file": "ArchivoBlack-Regular.ttf",
    },
    "anton": {"label": "Anton", "style": "condensed", "file": "Anton-Regular.ttf"},
    "bebas_neue": {
        "label": "Bebas Neue",
        "style": "condensed",
        "file": "BebasNeue-Regular.ttf",
    },
    "permanent_marker": {
        "label": "Permanent Marker",
        "style": "script",
        "file": "PermanentMarker-Regular.ttf",
    },
    "pacifico": {
        "label": "Pacifico",
        "style": "script",
        "file": "Pacifico-Regular.ttf",
    },
    "space_mono": {
        "label": "Space Mono",
        "style": "monospace",
        "file": "SpaceMono-Bold.ttf",
    },
    "dm_serif_display": {
        "label": "DM Serif Display",
        "style": "serif",
        "file": "DMSerifDisplay-Regular.ttf",
    },
    "abril_fatface": {
        "label": "Abril Fatface",
        "style": "serif",
        "file": "AbrilFatface-Regular.ttf",
    },
    "stardos_stencil": {
        "label": "Stardos Stencil",
        "style": "stencil",
        "file": "StardosStencil-Bold.ttf",
    },
}

DEFAULT_CONFIG = {
    "shirt_color": "Black",
    "text": "",
    "font": "archivo_black",
    "font_size": "medium",
    "alignment": "center",
    "letter_spacing": "normal",
    "placement": "center_chest",
}

# SPC-03: exactly these seven, in this order.
SHIRT_COLORS = {
    "Black": "#0b0b0c",
    "White": "#f5f5f2",
    "Navy": "#1c2541",
    "Charcoal": "#36393f",
    "Maroon": "#5c1a24",
    "Forest Green": "#1f3d2b",
    "Deep Purple": "#3b2352",
}

# FR-DES-05: a 10-colour palette; each shirt offers only the colours that
# clear WCAG's 3:1 graphics contrast against it (D-071).
TEXT_COLORS = {
    "Off White": "#f4f1ea",
    "Ink Black": "#111111",
    "Gold": "#e0b23a",
    "Crimson": "#d7263d",
    "Cobalt": "#2a5bd7",
    "Mint": "#7ed6b2",
    "Hot Pink": "#ff5ca8",
    "Safety Orange": "#e8590c",
    "Lime": "#c6f432",
    "Royal Purple": "#6a2c91",
}
MIN_TEXT_CONTRAST = 3.0

DEFAULT_TEXT_COLOR = "Off White"

# Size is a fraction of the placement box's width, before shrink-to-fit.
FONT_SIZES = {
    "small": {"label": "Small", "ratio": 0.08},
    "medium": {"label": "Medium", "ratio": 0.12},
    "large": {"label": "Large", "ratio": 0.16},
    "extra_large": {"label": "Extra Large", "ratio": 0.22},
}

ALIGNMENTS = {"center": "Center", "left": "Left", "right": "Right"}

LETTER_SPACINGS = {
    "normal": {"label": "Normal", "em": 0},
    "wide": {"label": "Wide", "em": 0.08},
    "extra_wide": {"label": "Extra Wide", "em": 0.2},
}


def _luminance(hex_color):
    def channel(value):
        c = int(value, 16) / 255
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

    r, g, b = (channel(hex_color[i : i + 2]) for i in (1, 3, 5))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast_ratio(hex_a, hex_b):
    high, low = sorted((_luminance(hex_a), _luminance(hex_b)), reverse=True)
    return (high + 0.05) / (low + 0.05)


def text_colors_for(shirt_color):
    shirt_hex = SHIRT_COLORS[shirt_color]
    return [
        name
        for name, hex_value in TEXT_COLORS.items()
        if contrast_ratio(shirt_hex, hex_value) >= MIN_TEXT_CONTRAST
    ]


def public_options():
    return {
        "canvas_size": CANVAS_SIZE,
        "units_per_inch": UNITS_PER_INCH,
        "print_dpi": PRINT_DPI,
        "text_limits": TEXT_LIMITS,
        "placements": [{"key": k, **v} for k, v in PLACEMENTS.items()],
        "shirt_colors": [{"name": k, "hex": v} for k, v in SHIRT_COLORS.items()],
        "fonts": [
            {"key": k, "label": v["label"], "style": v["style"]}
            for k, v in FONTS.items()
        ],
        "text_colors": [{"name": k, "hex": v} for k, v in TEXT_COLORS.items()],
        "text_colors_by_shirt": {name: text_colors_for(name) for name in SHIRT_COLORS},
        "font_sizes": [
            {"key": k, "label": v["label"], "ratio": v["ratio"]}
            for k, v in FONT_SIZES.items()
        ],
        "alignments": [{"key": k, "label": v} for k, v in ALIGNMENTS.items()],
        "letter_spacings": [
            {"key": k, "label": v["label"], "em": v["em"]}
            for k, v in LETTER_SPACINGS.items()
        ],
        "defaults": {**DEFAULT_CONFIG, "text_color": DEFAULT_TEXT_COLOR},
    }
