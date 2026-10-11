import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { DesignConfig } from "./types";

type DesignState = {
  config: DesignConfig | null;
  savedId: string | null;
  savedConfig: DesignConfig | null;
  name: string;
  initialize: (defaults: DesignConfig) => void;
  update: (patch: Partial<DesignConfig>) => void;
  setName: (name: string) => void;
  markSaved: (id: string, name: string, config: DesignConfig) => void;
  load: (id: string, name: string, config: DesignConfig) => void;
};

// The draft survives a reload or a detour through /register (FR-DES-08).
export const useDesignStore = create<DesignState>()(
  persist(
    (set) => ({
      config: null,
      savedId: null,
      savedConfig: null,
      name: "",
      // Defaults fill any key a draft from an older options shape lacks.
      initialize: (defaults) =>
        set((state) => ({ config: { ...defaults, ...state.config } })),
      update: (patch) =>
        set((state) =>
          state.config ? { config: { ...state.config, ...patch } } : state,
        ),
      setName: (name) => set({ name }),
      markSaved: (savedId, name, savedConfig) =>
        set({ savedId, name, savedConfig }),
      load: (savedId, name, config) =>
        set({ savedId, name, config, savedConfig: config }),
    }),
    {
      name: "momus-design-draft",
      storage: createJSONStorage(() => localStorage),
      partialize: ({ config, savedId, savedConfig, name }) => ({
        config,
        savedId,
        savedConfig,
        name,
      }),
    },
  ),
);

// Key order differs once Postgres has stored the config, so compare by key.
export function sameConfig(a: DesignConfig | null, b: DesignConfig | null) {
  if (!a || !b) return false;
  const keys = Object.keys(a) as (keyof DesignConfig)[];
  return (
    keys.length === Object.keys(b).length && keys.every((k) => a[k] === b[k])
  );
}
