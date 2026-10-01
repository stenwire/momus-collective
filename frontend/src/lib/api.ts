const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type Category = {
  id: string;
  name: string;
  slug: string;
};

export type Product = {
  id: string;
  slogan: string;
  slug: string;
  category: Category;
  price: number;
  mockup_images: string[];
  tags: string[];
  total_orders: number;
  avg_rating: string;
  created_at: string;
};

export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export async function fetchProducts(
  params: Record<string, string | number> = {},
): Promise<PaginatedResponse<Product>> {
  const query = new URLSearchParams(
    Object.entries(params).map(([key, value]) => [key, String(value)]),
  );
  const res = await fetch(`${API_URL}/api/v1/products/?${query}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch products: ${res.status}`);
  }
  return res.json();
}
