import unicodedata

from .options import TEXT_LIMITS


def sanitize_design_text(raw: str) -> str:
    """Strips control, format and unassigned code points (zero-width
    joiners, bidi overrides) and caps line count. Newlines survive.
    Mirrored by frontend/src/lib/design/sanitize.ts."""
    text = unicodedata.normalize("NFC", raw.replace("\r\n", "\n").replace("\r", "\n"))
    text = "".join(
        ch for ch in text if ch == "\n" or not unicodedata.category(ch).startswith("C")
    )
    lines = text.split("\n")
    max_lines = TEXT_LIMITS["max_lines"]
    if len(lines) > max_lines:
        lines = [*lines[: max_lines - 1], " ".join(lines[max_lines - 1 :])]
    return "\n".join(lines)
