import { vi } from "vitest";
import type { DesignOptions } from "@/lib/design/types";

export const designOptions: DesignOptions = {
  canvas_size: 1000,
  units_per_inch: 30,
  print_dpi: 300,
  text_limits: { max_length: 80, max_lines: 4 },
  placements: [
    {
      key: "center_chest",
      label: "Center Chest",
      box: { x: 335, y: 300, w: 330, h: 240 },
    },
  ],
  shirt_colors: [
    { name: "Black", hex: "#0b0b0c" },
    { name: "White", hex: "#f5f5f2" },
    { name: "Navy", hex: "#1c2541" },
  ],
  fonts: [
    { key: "archivo_black", label: "Archivo Black", style: "bold_sans" },
    { key: "anton", label: "Anton", style: "condensed" },
    { key: "pacifico", label: "Pacifico", style: "script" },
  ],
  text_colors: [
    { name: "Off White", hex: "#f4f1ea" },
    { name: "Ink Black", hex: "#111111" },
    { name: "Gold", hex: "#e0b23a" },
  ],
  text_colors_by_shirt: {
    Black: ["Off White", "Gold"],
    White: ["Ink Black"],
    Navy: ["Off White", "Gold"],
  },
  font_sizes: [
    { key: "small", label: "Small", ratio: 0.08 },
    { key: "medium", label: "Medium", ratio: 0.12 },
    { key: "large", label: "Large", ratio: 0.16 },
    { key: "extra_large", label: "Extra Large", ratio: 0.22 },
  ],
  alignments: [
    { key: "center", label: "Center" },
    { key: "left", label: "Left" },
    { key: "right", label: "Right" },
  ],
  letter_spacings: [
    { key: "normal", label: "Normal", em: 0 },
    { key: "wide", label: "Wide", em: 0.08 },
    { key: "extra_wide", label: "Extra Wide", em: 0.2 },
  ],
  defaults: {
    shirt_color: "Black",
    text: "",
    font: "archivo_black",
    font_size: "medium",
    text_color: "Off White",
    alignment: "center",
    letter_spacing: "normal",
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
