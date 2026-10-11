import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type Tokens = { access: string; refresh: string };

type AuthState = {
  tokens: Tokens | null;
  email: string | null;
  signIn: (tokens: Tokens, email: string) => void;
  setTokens: (tokens: Tokens) => void;
  signOut: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      tokens: null,
      email: null,
      signIn: (tokens, email) => set({ tokens, email }),
      setTokens: (tokens) => set({ tokens }),
      signOut: () => set({ tokens: null, email: null }),
    }),
    { name: "momus-auth", storage: createJSONStorage(() => localStorage) },
  ),
);
