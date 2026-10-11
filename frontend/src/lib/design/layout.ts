import type { Box } from "./types";

export type Align = "left" | "center" | "right";

export type LayoutParams = {
  fontPx: number;
  spacingEm: number;
  align: Align;
};

export type LaidOutLine = {
  text: string;
  x: number;
  baseline: number;
  fontPx: number;
  width: number;
};

export type Measure = (char: string, fontPx: number) => number;

// Mirrored by backend/designs/render.py; change both or neither.
export const LINE_HEIGHT = 1.2;
export const BASELINE = 0.85;
// A line wholly in parentheses is a disclaimer aside (FR-DES-10).
export const PARENTHETICAL_SCALE = 0.5;
const SHRINK = 0.9;
const MAX_SHRINKS = 30;

export function textWidth(
  text: string,
  fontPx: number,
  spacingEm: number,
  measure: Measure,
): number {
  const chars = Array.from(text);
  const advance = chars.reduce((sum, ch) => sum + measure(ch, fontPx), 0);
  return advance + spacingEm * fontPx * Math.max(chars.length - 1, 0);
}

function wrapParagraph(
  paragraph: string,
  fontPx: number,
  spacingEm: number,
  maxWidth: number,
  measure: Measure,
): string[] {
  const fits = (s: string) => textWidth(s, fontPx, spacingEm, measure) <= maxWidth;
  const lines: string[] = [];
  let current = "";
  for (const word of paragraph.split(" ").filter(Boolean)) {
    const candidate = current ? `${current} ${word}` : word;
    if (fits(candidate)) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = "";
    for (const ch of Array.from(word)) {
      if (current && !fits(current + ch)) {
        lines.push(current);
        current = "";
      }
      current += ch;
    }
  }
  if (current || lines.length === 0) lines.push(current);
  return lines;
}

function wrapAll(
  text: string,
  fontPx: number,
  spacingEm: number,
  maxWidth: number,
  measure: Measure,
) {
  return text.split("\n").flatMap((paragraph) => {
    const trimmed = paragraph.trim();
    const px =
      trimmed.length > 1 && trimmed.startsWith("(") && trimmed.endsWith(")")
        ? fontPx * PARENTHETICAL_SCALE
        : fontPx;
    return wrapParagraph(paragraph, px, spacingEm, maxWidth, measure).map(
      (line) => ({
        text: line,
        fontPx: px,
        width: textWidth(line, px, spacingEm, measure),
      }),
    );
  });
}

export function layoutText(
  text: string,
  box: Box,
  params: LayoutParams,
  measure: Measure,
): LaidOutLine[] {
  if (!text.trim()) return [];
  let fontPx = params.fontPx;
  let lines = wrapAll(text, fontPx, params.spacingEm, box.w, measure);
  for (let i = 0; i < MAX_SHRINKS; i++) {
    const height = lines.reduce((sum, l) => sum + l.fontPx * LINE_HEIGHT, 0);
    if (height <= box.h && lines.every((l) => l.width <= box.w)) break;
    fontPx *= SHRINK;
    lines = wrapAll(text, fontPx, params.spacingEm, box.w, measure);
  }

  const height = lines.reduce((sum, l) => sum + l.fontPx * LINE_HEIGHT, 0);
  let top = box.y + (box.h - height) / 2;
  return lines.map((line) => {
    const slot = line.fontPx * LINE_HEIGHT;
    const x =
      params.align === "left"
        ? box.x
        : params.align === "right"
          ? box.x + box.w - line.width
          : box.x + (box.w - line.width) / 2;
    const laid = { ...line, x, baseline: top + slot * BASELINE };
    top += slot;
    return laid;
  });
}
