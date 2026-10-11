import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { type CartData, type CartProduct, MAX_LINE_QUANTITY } from "./types";

// Guests keep catalog lines only: a custom design needs an account (D-075).
export type GuestLine = {
  id: string;
  product: CartProduct & { price: number };
  size: string;
  color: string;
  quantity: number;
};

type GuestCartState = {
  lines: GuestLine[];
  add: (line: Omit<GuestLine, "id">) => void;
  setQuantity: (id: string, quantity: number) => void;
  remove: (id: string) => void;
  clear: () => void;
};

const lineId = (l: Pick<GuestLine, "product" | "size" | "color">) =>
  `${l.product.id}:${l.size}:${l.color}`;

const clamp = (n: number) => Math.max(1, Math.min(MAX_LINE_QUANTITY, n));

export const useGuestCart = create<GuestCartState>()(
  persist(
    (set) => ({
      lines: [],
      add: (line) =>
        set((state) => {
          const id = lineId(line);
          const existing = state.lines.find((l) => l.id === id);
          if (existing) {
            return {
              lines: state.lines.map((l) =>
                l.id === id ? { ...l, quantity: clamp(l.quantity + line.quantity) } : l,
              ),
            };
          }
          return { lines: [...state.lines, { ...line, id, quantity: clamp(line.quantity) }] };
        }),
      setQuantity: (id, quantity) =>
        set((state) => ({
          lines: state.lines.map((l) => (l.id === id ? { ...l, quantity: clamp(quantity) } : l)),
        })),
      remove: (id) => set((state) => ({ lines: state.lines.filter((l) => l.id !== id) })),
      clear: () => set({ lines: [] }),
    }),
    { name: "momus-cart", storage: createJSONStorage(() => localStorage) },
  ),
);

// Display prices only: the server recomputes every total at checkout.
export function guestCartData(lines: GuestLine[]): CartData {
  const items = lines.map((l) => ({
    id: l.id,
    kind: "product" as const,
    product: { id: l.product.id, slug: l.product.slug, slogan: l.product.slogan, image: l.product.image },
    design: null,
    size: l.size,
    color: l.color,
    quantity: l.quantity,
    unit_price: l.product.price,
    line_total: l.product.price * l.quantity,
  }));
  return {
    items,
    item_count: items.reduce((n, i) => n + i.quantity, 0),
    subtotal: items.reduce((n, i) => n + i.line_total, 0),
  };
}
