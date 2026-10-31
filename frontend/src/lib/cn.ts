// Joins class names; later classes do not override earlier ones by rule,
// so callers pass only additive classes (layout, spacing, width).
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
