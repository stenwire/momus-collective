def naira(kobo):
    """Integer kobo as ₦ text, with kobo only when there are some (D-098)."""
    whole, rest = divmod(kobo, 100)
    return f"₦{whole:,}" + (f".{rest:02d}" if rest else "")
