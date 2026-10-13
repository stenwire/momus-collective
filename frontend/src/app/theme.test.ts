import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// jsdom gives import.meta.url an http scheme; vitest runs from frontend/.
const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

function token(name: string): string {
  const match = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-f]{6});`, "i"));
  if (!match) throw new Error(`--color-${name} is not a hex token in globals.css`);
  return match[1];
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Every text colour the storefront sets on each surface it sets it on.
const TEXT_PAIRS: [string, string][] = [
  ["bone", "ink"],
  ["bone", "ink-raised"],
  ["bone-muted", "ink"],
  ["bone-muted", "ink-raised"],
  ["laurel", "ink"],
  ["laurel", "ink-raised"],
  ["ink", "laurel"],
  ["error", "ink"],
  ["error", "ink-raised"],
  ["ok", "ink"],
  ["ok", "ink-raised"],
];

describe("theme tokens", () => {
  it.each(TEXT_PAIRS)("%s on %s meets WCAG AA for body text", (fg, bg) => {
    expect(contrast(token(fg), token(bg))).toBeGreaterThanOrEqual(4.5);
  });

  it("is dark only", () => {
    expect(css).toMatch(/color-scheme:\s*dark/);
  });

  it("draws a laurel focus ring", () => {
    expect(css).toMatch(/:focus-visible\s*{\s*outline:\s*2px solid var\(--color-laurel\)/);
  });
});
