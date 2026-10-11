import { vi } from "vitest";
import type { DesignOptions } from "@/lib/design/types";

export const designOptions: DesignOptions = {
  canvas_size: 1000,
  units_per_inch: 30,
  print_dpi: 300,
  placements: [
    {
      key: "center_chest",
      label: "Center Chest",
      box: { x: 335, y: 300, w: 330, h: 240 },
    },
  ],
  shirt_colors: [{ name: "Black", hex: "#0b0b0c" }],
  text_colors: [{ name: "Off White", hex: "#f4f1ea" }],
  defaults: {
    shirt_color: "Black",
    text: "",
    text_color: "Off White",
    placement: "center_chest",
  },
};

// Records every fillText and fillStyle so drawing can be asserted on.
export function fakeContext() {
  const calls = { fillText: [] as string[], fillStyles: [] as string[] };
  const ctx = {
    clearRect: vi.fn(),
    fill: vi.fn(function (this: { fillStyle: string }) {
      calls.fillStyles.push(this.fillStyle);
    }),
    stroke: vi.fn(),
    setTransform: vi.fn(),
    createLinearGradient: () => ({ addColorStop: vi.fn() }),
    measureText: (ch: string) => ({ width: ch.length * 10 }),
    fillText: vi.fn((ch: string) => calls.fillText.push(ch)),
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    font: "",
    textBaseline: "alphabetic",
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}
