import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { designOptions } from "@/test/design-fixtures";
import { DesignControls } from "./design-controls";
import { charReveal, drawDesign, mixHex, ShirtCanvas } from "./shirt-canvas";

const haptic = vi.fn();
vi.mock("@/lib/haptics", () => ({ haptic: (p: string) => haptic(p) }));

function recordingContext() {
  const calls = { fillStyles: [] as string[], drawn: [] as { ch: string; alpha: number }[] };
  const ctx = {
    clearRect: vi.fn(),
    fill: vi.fn(function (this: { fillStyle: string }) {
      calls.fillStyles.push(this.fillStyle);
    }),
    stroke: vi.fn(),
    setTransform: vi.fn(),
    strokeRect: vi.fn(),
    setLineDash: vi.fn(),
    createLinearGradient: () => ({ addColorStop: vi.fn() }),
    measureText: () => ({ width: 10 }),
    fillText: vi.fn(function (this: { globalAlpha: number }, ch: string) {
      calls.drawn.push({ ch, alpha: this.globalAlpha });
    }),
    fillStyle: "",
    globalAlpha: 1,
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}

beforeEach(() => {
  // jsdom has no Path2D; the drawing only needs it to exist.
  vi.stubGlobal(
    "Path2D",
    class {
      constructor(public d?: string) {}
    },
  );
});

afterEach(() => {
  haptic.mockClear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("canvas tweens", () => {
  it("mixes shirt colours channel by channel", () => {
    expect(mixHex("#000000", "#ffffff", 0)).toBe("#000000");
    expect(mixHex("#000000", "#ffffff", 0.5)).toBe("#808080");
    expect(mixHex("#0b0b0c", "#f5f5f2", 1)).toBe("#f5f5f2");
  });

  it("writes characters in one after another", () => {
    expect(charReveal(0, 0, 5)).toBe(0);
    expect(charReveal(0.4, 0, 5)).toBe(1);
    expect(charReveal(0.4, 4, 5)).toBe(0);
    expect(charReveal(1, 4, 5)).toBe(1);
  });

  it("paints a mid-fade shirt and draws only the characters revealed so far", () => {
    const { ctx, calls } = recordingContext();
    drawDesign(ctx, { ...designOptions.defaults, text: "hello" }, designOptions, {
      shirtHex: "#123456",
      reveal: 0.3,
    });
    expect(calls.fillStyles[0]).toBe("#123456");
    const drawnText = calls.drawn.map((c) => c.ch).join("");
    expect(drawnText.length).toBeGreaterThan(0);
    expect(drawnText.length).toBeLessThan(5);
    expect(calls.drawn[0].alpha).toBeGreaterThan(0);
  });

  it("draws the final frame at once under reduced motion", () => {
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: q.includes("reduce") }));
    const raf = vi.spyOn(window, "requestAnimationFrame");
    const { ctx } = recordingContext();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx as never);
    const { rerender } = render(
      <ShirtCanvas config={designOptions.defaults} options={designOptions} label="shirt" />,
    );
    rerender(
      <ShirtCanvas
        config={{ ...designOptions.defaults, shirt_color: "White" }}
        options={designOptions}
        label="shirt"
      />,
    );
    expect(raf).not.toHaveBeenCalled();
  });
});

describe("design controls", () => {
  it("ticks on discrete choices but not while typing", async () => {
    const update = vi.fn();
    render(
      <DesignControls config={designOptions.defaults} options={designOptions} update={update} />,
    );
    await userEvent.type(screen.getByLabelText("Your slogan"), "hi");
    expect(haptic).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "White" }));
    expect(haptic).toHaveBeenCalledWith("tick");
    expect(update).toHaveBeenLastCalledWith(expect.objectContaining({ shirt_color: "White" }));
  });
});
