from rest_framework import serializers

from carts.models import SavedDesign

from . import options
from .sanitize import sanitize_design_text

CONFIG_KEYS = {
    "shirt_color": options.SHIRT_COLORS,
    "text": None,
    "font": options.FONTS,
    "font_size": options.FONT_SIZES,
    "text_color": options.TEXT_COLORS,
    "alignment": options.ALIGNMENTS,
    "letter_spacing": options.LETTER_SPACINGS,
    "placement": options.PLACEMENTS,
}


def validate_design_config(config):
    """Every key the PRD's SavedDesign.config names, each checked against
    designs/options.py, the same definitions the tool renders from."""
    if not isinstance(config, dict):
        raise serializers.ValidationError("Config must be an object.")
    missing = CONFIG_KEYS.keys() - config.keys()
    unknown = config.keys() - CONFIG_KEYS.keys()
    if missing or unknown:
        raise serializers.ValidationError(
            f"Config needs exactly {sorted(CONFIG_KEYS)}; "
            f"missing {sorted(missing)}, unknown {sorted(unknown)}."
        )
    errors = {}
    for key, allowed in CONFIG_KEYS.items():
        if allowed is not None and config[key] not in allowed:
            errors[key] = f"{config[key]!r} is not an option."
    text = sanitize_design_text(str(config["text"]))
    if not text.strip():
        errors["text"] = "Add some text to your design."
    elif len(text) > options.TEXT_LIMITS["max_length"]:
        errors["text"] = (
            f"Keep it to {options.TEXT_LIMITS['max_length']} characters or fewer."
        )
    if not errors and config["text_color"] not in options.text_colors_for(
        config["shirt_color"]
    ):
        errors["text_color"] = (
            f"{config['text_color']} isn't readable on a {config['shirt_color']} shirt."
        )
    if errors:
        raise serializers.ValidationError(errors)
    return {**config, "text": text}


class SavedDesignSerializer(serializers.ModelSerializer):
    price = serializers.SerializerMethodField()

    class Meta:
        model = SavedDesign
        fields = [
            "id",
            "name",
            "config",
            "preview_image_url",
            "design_file_url",
            "price",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "preview_image_url",
            "design_file_url",
            "created_at",
            "updated_at",
        ]

    def get_price(self, design):
        return self.context["prices"].get(design.config.get("shirt_color"))

    def validate_name(self, value):
        name = sanitize_design_text(value).replace("\n", " ").strip()
        if not name:
            raise serializers.ValidationError("Give your design a name.")
        return name

    def validate_config(self, value):
        return validate_design_config(value)
