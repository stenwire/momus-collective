import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signedIn } from "@/test/auth";
import { designOptions } from "@/test/design-fixtures";
import { AdminProductEditor, AdminProducts } from "./products";

const json = (status: number, body: unknown) =>
  ({ ok: status < 400, status, json: async () => body }) as Response;

const savedProduct = {
  id: "p1",
  slogan: "Read More Books",
  slug: "read-more-books",
  category: "c1",
  price: 1500000,
  description: "",
  shirt_colors: ["Black"],
  mockup_images: ["https://example.com/front.png"],
  tags: ["NEW"],
  is_active: true,
  is_custom: false,
  display_order: 0,
  total_orders: 0,
  avg_rating: "0.00",
  created_at: "2026-10-01T00:00:00Z",
  updated_at: "2026-10-01T00:00:00Z",
};

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

function renderWith(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      {ui}
    </QueryClientProvider>,
  );
}
const renderProducts = () => renderWith(<AdminProducts />);

describe("AdminProducts", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let products: typeof savedProduct[];

  beforeEach(() => {
    signedIn();
    products = [];
    push.mockReset();
    fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/categories/")) {
        return json(200, { all_count: 1, categories: [{ id: "c1", name: "Hot Takes", slug: "hot-takes", product_count: 0 }] });
      }
      if (url.endsWith("/designs/options/")) return json(200, designOptions);
      if (url.includes("/admin/products/")) {
        const method = init?.method ?? "GET";
        const id = url.split("?")[0].split("/").filter(Boolean).at(-1);
        if (method === "GET") {
          return id === "products"
            ? json(200, { count: products.length, next: null, results: products })
            : json(200, products.find((product) => product.id === id));
        }
        if (method === "POST") {
          products = [{ ...savedProduct, ...JSON.parse(String(init?.body)) }];
          return json(201, products[0]);
        }
        if (method === "DELETE") {
          products = products.filter((product) => product.id !== id);
          return json(204, {});
        }
        if (method === "PATCH") {
          products = products.map((product) => product.id === id
            ? { ...product, ...JSON.parse(String(init?.body)) }
            : product);
          return json(200, products.find((product) => product.id === id));
        }
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("creates a product with category, price, mockups, tags and shirt colours", async () => {
    renderWith(<AdminProductEditor />);
    await userEvent.type(await screen.findByLabelText("Slogan"), "Read More Books");
    expect(screen.getByLabelText("Product URL slug")).toHaveValue("read-more-books");
    await userEvent.selectOptions(screen.getByLabelText("Category"), "c1");
    await userEvent.type(screen.getByLabelText("Price (₦)"), "15000");
    await userEvent.type(screen.getByLabelText("Mockup image URLs, one per line"), "https://example.com/front.png");
    await userEvent.type(screen.getByLabelText("Tags, separated by commas"), "NEW, STAFF PICK");
    await userEvent.click(screen.getByRole("checkbox", { name: "Black" }));
    await userEvent.click(screen.getByRole("button", { name: "Create product" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/admin/products"));
    const [, request] = fetchMock.mock.calls.find(([, init]) => init?.method === "POST")!;
    expect(request.method).toBe("POST");
    expect(JSON.parse(request.body as string)).toMatchObject({
      slogan: "Read More Books",
      slug: "read-more-books",
      category: "c1",
      price: 1500000,
      mockup_images: ["https://example.com/front.png"],
      tags: ["NEW", "STAFF PICK"],
      shirt_colors: ["Black"],
      is_custom: false,
    });
  });

  it("links each product to its own edit page", async () => {
    products = [savedProduct];
    renderProducts();
    expect(await screen.findByRole("link", { name: "Edit Read More Books" })).toHaveAttribute("href", "/admin/products/p1");
  });

  it("edits an existing product on its own page", async () => {
    products = [savedProduct];
    renderWith(<AdminProductEditor id="p1" />);
    const slogan = await screen.findByLabelText("Slogan");
    await userEvent.clear(slogan);
    await userEvent.type(slogan, "Read More Things");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/admin/products"));
    const [, request] = fetchMock.mock.calls.find(([, init]) => init?.method === "PATCH")!;
    expect(JSON.parse(request.body as string)).toMatchObject({ slogan: "Read More Things" });
  });

  it("unpublishes a product and makes it publishable again", async () => {
    products = [savedProduct];
    renderProducts();
    await userEvent.click(await screen.findByRole("button", { name: "Unpublish Read More Books" }));

    expect(await screen.findByText(/moved to drafts/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publish Read More Books" })).toBeInTheDocument();
    const [, request] = fetchMock.mock.calls.find(([, init]) => init?.method === "PATCH")!;
    expect(JSON.parse(request.body as string)).toMatchObject({ is_active: false });
  });

  it("filters the list by status and category on the server", async () => {
    products = [savedProduct];
    renderProducts();
    await screen.findByText("Read More Books");
    await userEvent.click(screen.getByRole("button", { name: "Drafts" }));
    await userEvent.selectOptions(screen.getByLabelText("Filter by category"), "c1");
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes("status=draft") && String(url).includes("category=c1"))).toBe(true),
    );
    await userEvent.click(await screen.findByRole("button", { name: "Clear filters" }));
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true");
  });

  it("requires confirmation before deleting a product", async () => {
    products = [savedProduct];
    renderProducts();
    await userEvent.click(await screen.findByRole("button", { name: "Delete Read More Books" }));
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "DELETE")).toBe(false);
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(await screen.findByText("No products yet")).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "DELETE")).toBe(true);
  });
});