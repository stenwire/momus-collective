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

export type ProductDetail = Product & {
  description: string;
  shirt_colors: string[];
  related_products: Product[];
};

export async function fetchProduct(slug: string): Promise<ProductDetail | null> {
  const res = await fetch(`${API_URL}/api/v1/products/${slug}/`);
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    throw new Error(`Failed to fetch product: ${res.status}`);
  }
  return res.json();
}

export type CategoryWithCount = Category & { product_count: number };

export type CategoryList = {
  all_count: number;
  categories: CategoryWithCount[];
};

export async function fetchCategories(): Promise<CategoryList> {
  const res = await fetch(`${API_URL}/api/v1/categories/`);
  if (!res.ok) {
    throw new Error(`Failed to fetch categories: ${res.status}`);
  }
  return res.json();
}
