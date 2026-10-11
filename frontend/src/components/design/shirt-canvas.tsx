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

export function drawDesign(
  ctx: CanvasRenderingContext2D,
  config: DesignConfig,
  options: DesignOptions,
  { guide = false }: { guide?: boolean } = {},
) {
  const size = options.canvas_size;
  ctx.clearRect(0, 0, size, size);

  const shirt = new Path2D(SHIRT_PATH);
  ctx.fillStyle = hexFor(options.shirt_colors, config.shirt_color);
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
  for (const line of lines) {
    ctx.font = canvasFont(config.font, line.fontPx);
    let x = line.x;
    for (const ch of Array.from(line.text)) {
      ctx.fillText(ch, x, line.baseline);
      x += measure(ch, line.fontPx) + spacingEm * line.fontPx;
    }
  }
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

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const render = () => {
      const scale =
        (canvas.clientWidth * window.devicePixelRatio) / options.canvas_size;
      canvas.width = Math.round(options.canvas_size * scale);
      canvas.height = canvas.width;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      drawDesign(ctx, config, options, { guide });
    };
    render();
    // Canvas text never triggers a webfont load, so load it, then redraw.
    let live = true;
    document.fonts
      ?.load(canvasFont(config.font, 40))
      .then(() => live && render());
    window.addEventListener("resize", render);
    return () => {
      live = false;
      window.removeEventListener("resize", render);
    };
  }, [config, options, guide]);

  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={label}
      className="aspect-square w-full rounded-lg bg-zinc-900"
    />
  );
}
