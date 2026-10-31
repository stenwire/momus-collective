// Inputs keep the global laurel focus ring; the border also turns laurel.
// No width here: cn() does not merge, so callers add w-full or flex-1.
export const inputClasses =
  "min-h-11 min-w-0 border border-rule bg-ink px-3 text-base text-bone placeholder:text-bone-muted transition-colors duration-150 hover:border-bone-muted focus-visible:border-laurel motion-reduce:transition-none";

export const labelClasses = "font-mono text-xs uppercase tracking-widest text-bone-muted";
