// SPC-02: exactly these five, project-wide, not configurable per product.
export const SIZES = ["S", "M", "L", "XL", "XXL"] as const;
export type Size = (typeof SIZES)[number];
