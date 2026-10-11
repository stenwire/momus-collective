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

DEFAULT_CONFIG = {
    "shirt_color": "Black",
    "text": "",
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

TEXT_COLORS = {"Off White": "#f4f1ea"}

DEFAULT_TEXT_COLOR = "Off White"


def public_options():
    return {
        "canvas_size": CANVAS_SIZE,
        "units_per_inch": UNITS_PER_INCH,
        "print_dpi": PRINT_DPI,
        "placements": [{"key": k, **v} for k, v in PLACEMENTS.items()],
        "shirt_colors": [{"name": k, "hex": v} for k, v in SHIRT_COLORS.items()],
        "text_colors": [{"name": k, "hex": v} for k, v in TEXT_COLORS.items()],
        "defaults": {**DEFAULT_CONFIG, "text_color": DEFAULT_TEXT_COLOR},
    }
