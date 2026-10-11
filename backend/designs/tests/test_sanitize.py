from designs.sanitize import sanitize_design_text


def test_plain_text_passes_through_unchanged():
    assert sanitize_design_text("touch grass") == "touch grass"


def test_newlines_survive_and_crlf_is_normalised():
    assert sanitize_design_text("one\r\ntwo\rthree") == "one\ntwo\nthree"


def test_control_and_invisible_format_characters_are_stripped():
    raw = "bell\u0007 tab\t zero​width rtl‮override"
    assert sanitize_design_text(raw) == "bell tab zerowidth rtloverride"


def test_markup_is_kept_as_literal_text_not_interpreted():
    # Escaping is the renderer's job; the text itself is just characters.
    assert sanitize_design_text("<b>hi</b>") == "<b>hi</b>"


def test_lines_beyond_the_limit_fold_into_the_last_line():
    assert sanitize_design_text("a\nb\nc\nd\ne\nf") == "a\nb\nc\nd e f"


def test_composed_and_decomposed_accents_normalise_to_one_form():
    assert sanitize_design_text("café") == "café"
