import { create } from "zustand";
import { errorMessages } from "@/lib/auth/api";

export type Toast = {
  id: number;
  message: string;
  tone: "neutral" | "success" | "error";
  label: string;
  action?: { label: string; onClick: () => void };
};

type ToastState = {
  toasts: Toast[];
  dismiss: (id: number) => void;
};

const LABELS = { neutral: "Noted", success: "Done", error: "Failed" } as const;

export const TOAST_MS = 5000;
// Longer when there is something to press, like Undo.
export const ACTION_TOAST_MS = 8000;
let nextId = 1;

// Each toast's countdown, so hovering or focusing it can pause the clock
// (WCAG 2.2.1) and leaving resumes with the time it had left.
const clocks = new Map<number, { timer?: ReturnType<typeof setTimeout>; remaining: number; started: number }>();

function run(id: number) {
  const clock = clocks.get(id);
  if (!clock) return;
  clock.started = Date.now();
  clock.timer = setTimeout(() => useToasts.getState().dismiss(id), clock.remaining);
}

export const useToasts = create<ToastState>((set) => ({
  toasts: [],
  dismiss: (id) => {
    clearTimeout(clocks.get(id)?.timer);
    clocks.delete(id);
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));

export function pauseToast(id: number) {
  const clock = clocks.get(id);
  if (!clock?.timer) return;
  clearTimeout(clock.timer);
  clock.timer = undefined;
  clock.remaining = Math.max(0, clock.remaining - (Date.now() - clock.started));
}

export function resumeToast(id: number) {
  const clock = clocks.get(id);
  if (clock && !clock.timer) run(id);
}

export function toastError(error: unknown) {
  return toast(errorMessages(error).join(" "), { tone: "error" });
}

export function toast(
  message: string,
  options: { tone?: Toast["tone"]; label?: string; action?: Toast["action"] } = {},
): number {
  const id = nextId++;
  const tone = options.tone ?? "neutral";
  const entry: Toast = { id, message, tone, label: options.label ?? LABELS[tone], action: options.action };
  // Newest last, at most three on screen.
  useToasts.setState((s) => {
    const kept = [...s.toasts, entry].slice(-3);
    s.toasts.filter((t) => !kept.includes(t)).forEach((t) => clocks.delete(t.id));
    return { toasts: kept };
  });
  clocks.set(id, { remaining: entry.action ? ACTION_TOAST_MS : TOAST_MS, started: Date.now() });
  run(id);
  return id;
}
