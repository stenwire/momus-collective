import type { DesignConfig, DesignOptions, NamedColor } from "./types";

export function allowedTextColors(
  options: DesignOptions,
  shirtColor: string,
): NamedColor[] {
  const allowed = options.text_colors_by_shirt[shirtColor] ?? [];
  return options.text_colors.filter((c) => allowed.includes(c.name));
}

// Keeps the slogan readable: a text colour that fails contrast on the new
// shirt is swapped for that shirt's first readable one.
export function withShirtColor(
  config: DesignConfig,
  shirtColor: string,
  options: DesignOptions,
): Partial<DesignConfig> {
  const allowed = options.text_colors_by_shirt[shirtColor] ?? [];
  if (allowed.includes(config.text_color) || allowed.length === 0) {
    return { shirt_color: shirtColor };
  }
  return { shirt_color: shirtColor, text_color: allowed[0] };
}

export function layoutParamsFor(config: DesignConfig, options: DesignOptions) {
  const size =
    options.font_sizes.find((s) => s.key === config.font_size) ??
    options.font_sizes[0];
  const spacing =
    options.letter_spacings.find((s) => s.key === config.letter_spacing) ??
    options.letter_spacings[0];
  return {
    ratio: size.ratio,
    spacingEm: spacing.em,
    align: config.alignment as "left" | "center" | "right",
  };
}
