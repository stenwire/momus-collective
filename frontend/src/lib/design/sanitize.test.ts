import { describe, expect, it } from "vitest";
import { characterCount, sanitizeDesignText } from "./sanitize";

const limits = { max_length: 80, max_lines: 4 };
const clean = (raw: string) => sanitizeDesignText(raw, limits);

describe("sanitizeDesignText", () => {
  it("passes plain text through unchanged", () => {
    expect(clean("touch grass")).toBe("touch grass");
  });

  it("keeps newlines and normalises CRLF", () => {
    expect(clean("one\r\ntwo\rthree")).toBe("one\ntwo\nthree");
  });

  it("strips control and invisible format characters", () => {
    const raw = "bell\u0007 tab\t zero​width rtl‮override";
    expect(clean(raw)).toBe("bell tab zerowidth rtloverride");
  });

  it("folds lines beyond the limit into the last line", () => {
    expect(clean("a\nb\nc\nd\ne\nf")).toBe("a\nb\nc\nd e f");
  });

  it("normalises decomposed accents", () => {
    expect(clean("café")).toBe("café");
  });

  it("caps at 80 characters, counting an emoji as one", () => {
    expect(characterCount(clean("x".repeat(100)))).toBe(80);
    expect(characterCount(clean("🔥".repeat(100)))).toBe(80);
  });
});
