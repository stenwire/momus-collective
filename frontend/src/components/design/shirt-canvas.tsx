"use client";

import { useEffect, useRef } from "react";
import { layoutParamsFor } from "@/lib/design/config";
import { canvasFont } from "@/lib/design/fonts";
import { layoutText } from "@/lib/design/layout";
import { sanitizeDesignText } from "@/lib/design/sanitize";
import { COLLAR_PATH, SHIRT_PATH } from "@/lib/design/shirt-path";
import type { DesignConfig, DesignOptions } from "@/lib/design/types";

function hexFor(colors: { name: string; hex: string }[], name: string) {
  return colors.find((c) => c.name === name)?.hex ?? "#000000";
}

export function mixHex(from: string, to: string, t: number): string {
  const channel = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  const mixed = [0, 1, 2].map((i) =>
    Math.round(channel(from, i) + (channel(to, i) - channel(from, i)) * t),
  );
  return `#${mixed.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

// How visible character i of n is while a new font writes in (reveal 0→1):
// each starts a little after the one before and settles by the end.
export function charReveal(reveal: number, i: number, n: number): number {
  const start = n > 1 ? (i / (n - 1)) * 0.6 : 0;
  return Math.min(1, Math.max(0, (reveal - start) / 0.4));
}

const TWEEN_MS = 260;

export function drawDesign(
  ctx: CanvasRenderingContext2D,
  config: DesignConfig,
  options: DesignOptions,
  {
    guide = false,
    shirtHex,
    reveal = 1,
  }: { guide?: boolean; shirtHex?: string; reveal?: number } = {},
) {
  const size = options.canvas_size;
  ctx.clearRect(0, 0, size, size);

  const shirt = new Path2D(SHIRT_PATH);
  ctx.fillStyle = shirtHex ?? hexFor(options.shirt_colors, config.shirt_color);
  ctx.fill(shirt);
  const shade = ctx.createLinearGradient(0, 120, 0, 900);
  shade.addColorStop(0, "rgba(255,255,255,0.06)");
  shade.addColorStop(1, "rgba(0,0,0,0.18)");
  ctx.fillStyle = shade;
  ctx.fill(shirt);
  ctx.strokeStyle = "rgba(128,128,128,0.45)";
  ctx.lineWidth = 3;
  ctx.stroke(shirt);
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fill(new Path2D(COLLAR_PATH));

  const placement =
    options.placements.find((p) => p.key === config.placement) ??
    options.placements[0];
  const box = placement.box;
  if (guide) {
    ctx.setLineDash([12, 10]);
    ctx.strokeStyle = "rgba(160,160,160,0.6)";
    ctx.lineWidth = 2;
    ctx.strokeRect(box.x, box.y, box.w, box.h);
    ctx.setLineDash([]);
  }
  const measure = (ch: string, px: number) => {
    ctx.font = canvasFont(config.font, px);
    return ctx.measureText(ch).width;
  };
  const { ratio, spacingEm, align } = layoutParamsFor(config, options);
  const lines = layoutText(
    sanitizeDesignText(config.text, options.text_limits),
    box,
    { fontPx: box.w * ratio, spacingEm, align },
    measure,
  );

  ctx.fillStyle = hexFor(options.text_colors, config.text_color);
  ctx.textBaseline = "alphabetic";
  const total = lines.reduce((n, line) => n + Array.from(line.text).length, 0);
  let index = 0;
  for (const line of lines) {
    ctx.font = canvasFont(config.font, line.fontPx);
    let x = line.x;
    for (const ch of Array.from(line.text)) {
      const shown = reveal >= 1 ? 1 : charReveal(reveal, index, total);
      if (shown > 0) {
        ctx.globalAlpha = shown;
        ctx.fillText(ch, x, line.baseline + (1 - shown) * 0.3 * line.fontPx);
      }
      x += measure(ch, line.fontPx) + spacingEm * line.fontPx;
      index += 1;
    }
  }
  ctx.globalAlpha = 1;
}

export function ShirtCanvas({
  config,
  options,
  label,
  guide = false,
}: {
  config: DesignConfig;
  options: DesignOptions;
  label: string;
  guide?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawn = useRef<{ hex: string; font: string } | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const targetHex = hexFor(options.shirt_colors, config.shirt_color);
    const previous = drawn.current;
    drawn.current = { hex: targetHex, font: config.font };
    const draw = (shirtHex?: string, reveal?: number) => {
      const scale =
        (canvas.clientWidth * window.devicePixelRatio) / options.canvas_size;
      canvas.width = Math.round(options.canvas_size * scale);
      canvas.height = canvas.width;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      drawDesign(ctx, config, options, { guide, shirtHex, reveal });
    };
    const render = () => draw();

    // A new shirt colour fades in and a new font writes itself in; a first
    // draw, any other change, or reduced motion draws the final frame.
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const recolour = previous !== null && previous.hex !== targetHex;
    const refont = previous !== null && previous.font !== config.font;
    let frame = 0;
    if (!reduce && (recolour || refont)) {
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / TWEEN_MS);
        draw(recolour ? mixHex(previous.hex, targetHex, t) : undefined, refont ? t : 1);
        if (t < 1) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    } else {
      render();
    }
    // Canvas text never triggers a webfont load, so load it, then redraw.
    let live = true;
    document.fonts
      ?.load(canvasFont(config.font, 40))
      .then(() => live && render());
    window.addEventListener("resize", render);
    return () => {
      live = false;
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", render);
    };
  }, [config, options, guide]);

  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={label}
      className="aspect-square w-full border border-rule bg-ink"
    />
  );
}
