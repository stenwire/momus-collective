import { create } from "zustand";

export type SessionUser = { email: string; first_name: string };

// No tokens here: they live in httpOnly cookies no script can read (D-080).
// The CSRF token is held in memory only, never persisted.
type AuthState = {
  status: "unknown" | "signed-in" | "signed-out";
  user: SessionUser | null;
  csrf: string | null;
  setSession: (user: SessionUser | null, csrf: string | null) => void;
  signOut: () => void;
};

export const useAuthStore = create<AuthState>()((set) => ({
  status: "unknown",
  user: null,
  csrf: null,
  setSession: (user, csrf) =>
    set({ user, csrf, status: user ? "signed-in" : "signed-out" }),
  signOut: () => set({ user: null, status: "signed-out" }),
}));
