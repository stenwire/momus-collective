import { describe, expect, it } from "vitest";
import { designOptions } from "@/test/design-fixtures";
import { allowedTextColors, layoutParamsFor, withShirtColor } from "./config";

const config = designOptions.defaults;

describe("allowedTextColors", () => {
  it("offers only the colours that contrast with the shirt", () => {
    expect(allowedTextColors(designOptions, "White").map((c) => c.name)).toEqual([
      "Ink Black",
    ]);
  });
});

describe("withShirtColor", () => {
  it("keeps a text colour that still contrasts", () => {
    expect(withShirtColor(config, "Navy", designOptions)).toEqual({
      shirt_color: "Navy",
    });
  });

  it("swaps a text colour that would vanish on the new shirt", () => {
    expect(withShirtColor(config, "White", designOptions)).toEqual({
      shirt_color: "White",
      text_color: "Ink Black",
    });
  });
});

describe("layoutParamsFor", () => {
  it("resolves size, spacing and alignment keys to numbers", () => {
    const params = layoutParamsFor(
      { ...config, font_size: "extra_large", letter_spacing: "wide", alignment: "left" },
      designOptions,
    );
    expect(params).toEqual({ ratio: 0.22, spacingEm: 0.08, align: "left" });
  });
});
