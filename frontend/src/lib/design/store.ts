import { create } from "zustand";
import type { DesignConfig } from "./types";

type DesignState = {
  config: DesignConfig | null;
  initialize: (config: DesignConfig) => void;
  update: (patch: Partial<DesignConfig>) => void;
};

export const useDesignStore = create<DesignState>((set) => ({
  config: null,
  initialize: (config) => set({ config }),
  update: (patch) =>
    set((state) =>
      state.config ? { config: { ...state.config, ...patch } } : state,
    ),
}));
