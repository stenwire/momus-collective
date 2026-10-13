import type { Transition } from "motion/react";

// Seconds, as motion expects. Exits run at ~70% of the enter time.
export const duration = {
  micro: 0.12,
  short: 0.2,
  medium: 0.32,
  long: 0.56,
} as const;

export function exitDuration(enter: number): number {
  return Math.round(enter * 0.7 * 1000) / 1000;
}

export const spring = {
  snap: { type: "spring", stiffness: 700, damping: 40 },
  press: { type: "spring", stiffness: 500, damping: 30 },
  settle: { type: "spring", stiffness: 260, damping: 26 },
} as const satisfies Record<string, Transition>;

export const ease = {
  out: [0.16, 1, 0.3, 1],
  in: [0.7, 0, 0.84, 0],
} as const;

export const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  shown: { opacity: 1, y: 0 },
} as const;

export const STAGGER = 0.04;
