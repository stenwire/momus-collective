import { create } from "zustand";

type DrawerState = { open: boolean; setOpen: (open: boolean) => void };

export const useCartDrawer = create<DrawerState>()((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
