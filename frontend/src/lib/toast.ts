import { create } from "zustand";

export type Toast = {
  id: number;
  message: string;
  tone: "neutral" | "error";
  action?: { label: string; onClick: () => void };
};

type ToastState = {
  toasts: Toast[];
  dismiss: (id: number) => void;
};

export const TOAST_MS = 5000;
// Longer when there is something to press, like Undo.
export const ACTION_TOAST_MS = 8000;
let nextId = 1;

export const useToasts = create<ToastState>((set) => ({
  toasts: [],
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function toast(
  message: string,
  options: { tone?: Toast["tone"]; action?: Toast["action"] } = {},
): number {
  const id = nextId++;
  const entry: Toast = { id, message, tone: options.tone ?? "neutral", action: options.action };
  // Newest last, at most three on screen.
  useToasts.setState((s) => ({ toasts: [...s.toasts, entry].slice(-3) }));
  setTimeout(() => useToasts.getState().dismiss(id), entry.action ? ACTION_TOAST_MS : TOAST_MS);
  return id;
}
