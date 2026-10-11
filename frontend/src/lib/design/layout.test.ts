import { describe, expect, it } from "vitest";
import { LINE_HEIGHT, layoutText, textWidth } from "./layout";

// Every glyph advances exactly half its font size: widths become exact.
const measure = (_ch: string, px: number) => px / 2;
const box = { x: 100, y: 200, w: 300, h: 200 };
const center = { fontPx: 40, spacingEm: 0, align: "center" as const };

describe("textWidth", () => {
  it("adds letter spacing between characters, not after the last", () => {
    expect(textWidth("abc", 40, 0, measure)).toBe(60);
    expect(textWidth("abc", 40, 0.5, measure)).toBe(60 + 2 * 20);
  });
});

describe("layoutText", () => {
  it("lays out nothing for blank text", () => {
    expect(layoutText("   ", box, center, measure)).toEqual([]);
  });

  it("centers a short line inside the box", () => {
    const [line] = layoutText("hello", box, center, measure);
    expect(line.width).toBe(100);
    expect(line.x).toBe(100 + (300 - 100) / 2);
  });

  it("aligns left and right to the box edges", () => {
    const left = layoutText("hi", box, { ...center, align: "left" }, measure);
    const right = layoutText("hi", box, { ...center, align: "right" }, measure);
    expect(left[0].x).toBe(100);
    expect(right[0].x + right[0].width).toBe(400);
  });

  it("wraps words that overflow the box width", () => {
    // 20px glyphs in a 300px box: 15 characters per line.
    const lines = layoutText("aaaa bbbb cccc dddd", box, center, measure);
    expect(lines.map((l) => l.text)).toEqual(["aaaa bbbb cccc", "dddd"]);
  });

  it("keeps explicit line breaks", () => {
    const lines = layoutText("one\ntwo", box, center, measure);
    expect(lines.map((l) => l.text)).toEqual(["one", "two"]);
  });

  it("breaks a single word longer than the box", () => {
    const lines = layoutText("x".repeat(20), box, center, measure);
    expect(lines.length).toBe(2);
    expect(lines.every((l) => l.width <= box.w)).toBe(true);
  });

  it("shrinks the font until the block fits the box height", () => {
    const text = Array.from({ length: 8 }, () => "line").join("\n");
    const lines = layoutText(text, box, center, measure);
    const height = lines.reduce((s, l) => s + l.fontPx * LINE_HEIGHT, 0);
    expect(lines[0].fontPx).toBeLessThan(40);
    expect(height).toBeLessThanOrEqual(box.h);
  });

  it("centers the block vertically", () => {
    const [line] = layoutText("hi", box, center, measure);
    const slot = 40 * LINE_HEIGHT;
    const top = 200 + (200 - slot) / 2;
    expect(line.baseline).toBeGreaterThan(top);
    expect(line.baseline).toBeLessThan(top + slot);
  });
});
