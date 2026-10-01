from django.apps import apps

APP_MONEY_LABELS = frozenset(
    {
        "price",
        "subtotal",
        "delivery_fee",
        "discount",
        "total",
        "unit_price",
        "discount_value",
        "min_order_value",
        "avg_rating",
    }
)
PROJECT_APPS = {
    "accounts",
    "catalog",
    "carts",
    "orders",
    "promocodes",
    "reviews",
    "newsletter",
}


def project_models():
    return [m for m in apps.get_models() if m._meta.app_label in PROJECT_APPS]


def test_no_model_field_is_a_floatfield():
    """SPC-14 / SEC blocker: money is never a float, anywhere."""
    offenders = [
        f"{m._meta.label}.{f.name}"
        for m in project_models()
        for f in m._meta.get_fields()
        if hasattr(f, "get_internal_type") and _safe_type(f) == "FloatField"
    ]
    assert offenders == []


def test_every_known_money_field_is_integer_or_decimal():
    allowed = {"PositiveIntegerField", "PositiveSmallIntegerField", "DecimalField"}
    checked = []
    for model in project_models():
        for field in model._meta.get_fields():
            if getattr(field, "name", None) in APP_MONEY_LABELS:
                internal = _safe_type(field)
                checked.append((f"{model._meta.label}.{field.name}", internal))
                assert internal in allowed, (
                    f"{model._meta.label}.{field.name} is {internal}"
                )
    # A regression here means a money field was renamed or removed and this
    # test silently stopped checking anything -- fail loudly instead.
    assert len(checked) >= 9


def _safe_type(field):
    try:
        return field.get_internal_type()
    except Exception:
        return None
