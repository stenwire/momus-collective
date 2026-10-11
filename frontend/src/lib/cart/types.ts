import type { DesignConfig } from "@/lib/design/types";

export type CartProduct = {
  id: string;
  slug: string;
  slogan: string;
  image: string | null;
};

export type CartDesign = { id: string; name: string; config: DesignConfig };

export type CartLine = {
  id: string;
  kind: "product" | "design";
  product: CartProduct | null;
  design: CartDesign | null;
  size: string;
  color: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

export type CartData = {
  items: CartLine[];
  item_count: number;
  subtotal: number;
};

export type AddToCart =
  | {
      product: CartProduct & { price: number };
      size: string;
      color: string;
      quantity?: number;
    }
  | { design: CartDesign; size: string; quantity?: number };

export const MAX_LINE_QUANTITY = 10;
