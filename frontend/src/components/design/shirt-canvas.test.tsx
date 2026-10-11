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

  it("sanitizes text again at draw time", () => {
    const { ctx, calls } = fakeContext();
    drawDesign(ctx, { ...designOptions.defaults, text: "a\u202eb" }, designOptions);
    expect(calls.fillText.join("")).toBe("ab");
  });

  it("draws the text in the selected font", () => {
    const { ctx } = fakeContext();
    drawDesign(ctx, { ...designOptions.defaults, text: "hi", font: "anton" }, designOptions);
    expect(ctx.font).toMatch(/^400 [\d.]+px 'Anton'$/);
  });

  it("spaces letters by the chosen em amount", () => {
    const xs = (spacing: string) => {
      const { ctx } = fakeContext();
      const xPositions: number[] = [];
      ctx.fillText = ((_ch: string, x: number) => xPositions.push(x)) as never;
      drawDesign(ctx, { ...designOptions.defaults, text: "ab", letter_spacing: spacing, alignment: "left" }, designOptions);
      return xPositions[1] - xPositions[0];
    };
    expect(xs("extra_wide")).toBeGreaterThan(xs("normal"));
  });

  it("outlines the selected print area only when the guide is on", () => {
    const { ctx } = fakeContext();
    drawDesign(ctx, { ...designOptions.defaults, placement: "full_front" }, designOptions, { guide: true });
    expect(ctx.strokeRect).toHaveBeenCalledWith(320, 230, 360, 480);
    const plain = fakeContext();
    drawDesign(plain.ctx, designOptions.defaults, designOptions);
    expect(plain.ctx.strokeRect).not.toHaveBeenCalled();
  });

  it("places text inside the chosen placement's box", () => {
    const ys = (placement: string) => {
      const { ctx } = fakeContext();
      const baselines: number[] = [];
      ctx.fillText = ((_c: string, _x: number, y: number) => baselines.push(y)) as never;
      drawDesign(ctx, { ...designOptions.defaults, text: "hi", placement }, designOptions);
      return baselines[0];
    };
    expect(ys("upper_chest")).toBeGreaterThan(215);
    expect(ys("upper_chest")).toBeLessThan(335);
    expect(ys("lower_chest")).toBeGreaterThan(560);
    expect(ys("lower_chest")).toBeLessThan(710);
  });
});
