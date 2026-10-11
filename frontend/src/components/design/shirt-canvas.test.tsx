import { beforeAll, describe, expect, it, vi } from "vitest";
import { designOptions, fakeContext } from "@/test/design-fixtures";
import { drawDesign } from "./shirt-canvas";

beforeAll(() => {
  vi.stubGlobal(
    "Path2D",
    class {
      constructor(public d?: string) {}
    },
  );
});

describe("drawDesign", () => {
  it("fills the shirt in the selected color", () => {
    const { ctx, calls } = fakeContext();
    drawDesign(ctx, { ...designOptions.defaults, text: "" }, designOptions);
    expect(calls.fillStyles[0]).toBe("#0b0b0c");
  });

  it("repaints the shirt when the color changes", () => {
    const { ctx, calls } = fakeContext();
    drawDesign(ctx, { ...designOptions.defaults, shirt_color: "White" }, designOptions);
    expect(calls.fillStyles[0]).toBe("#f5f5f2");
  });

  it("draws every character of the slogan in the text color", () => {
    const { ctx, calls } = fakeContext();
    drawDesign(ctx, { ...designOptions.defaults, text: "hi you" }, designOptions);
    expect(calls.fillText.join("")).toBe("hi you");
    expect(ctx.fillStyle).toBe("#f4f1ea");
  });

  it("draws no text when the slogan is empty", () => {
    const { ctx, calls } = fakeContext();
    drawDesign(ctx, designOptions.defaults, designOptions);
    expect(calls.fillText).toEqual([]);
  });
});
