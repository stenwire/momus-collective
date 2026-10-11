import type { TextLimits } from "./types";

// Mirrors backend/designs/sanitize.py, plus the length cap the backend
// enforces by rejecting rather than truncating.
export function sanitizeDesignText(raw: string, limits: TextLimits): string {
  const text = raw
    .replace(/\r\n?/g, "\n")
    .normalize("NFC")
    .replace(/(?!\n)\p{C}/gu, "");
  let lines = text.split("\n");
  if (lines.length > limits.max_lines) {
    lines = [
      ...lines.slice(0, limits.max_lines - 1),
      lines.slice(limits.max_lines - 1).join(" "),
    ];
  }
  return Array.from(lines.join("\n")).slice(0, limits.max_length).join("");
}

export function characterCount(text: string): number {
  return Array.from(text).length;
}
