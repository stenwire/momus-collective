import { create } from "zustand";

// Which card instance was tapped, so only that one shares its layoutId
// with the product view: a product shown in two carousels must not.
type SharedMockup = {
  productId: string | null;
  owner: string | null;
  claim: (productId: string, owner: string) => void;
};

export const useSharedMockup = create<SharedMockup>((set) => ({
  productId: null,
  owner: null,
  claim: (productId, owner) => set({ productId, owner }),
}));

export const mockupLayoutId = (productId: string) => `mockup-${productId}`;
