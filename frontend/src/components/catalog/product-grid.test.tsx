import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProductGrid } from "./product-grid";

function makeProduct(id: string, slogan: string) {
  return {
    id,
    slogan,
    slug: slogan,
    category: { id: "1", name: "Philosophy", slug: "philosophy" },
    price: 500000,
    mockup_images: ["/mockup.png"],
    tags: [],
    total_orders: 0,
    avg_rating: "0.00",
    created_at: "2026-01-01T00:00:00Z",
  };
}

function renderWithQueryClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

describe("ProductGrid infinite scroll", () => {
  let intersectCallback: (entries: { isIntersecting: boolean }[]) => void;

  beforeEach(() => {
    class MockObserver {
      constructor(cb: (entries: { isIntersecting: boolean }[]) => void) {
        intersectCallback = cb;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal("IntersectionObserver", MockObserver);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (url: string) => {
        const page = new URL(url).searchParams.get("page") ?? "1";
        if (page === "2") {
          return {
            ok: true,
            json: async () => ({
              count: 2,
              next: null,
              previous: "page=1",
              results: [makeProduct("2", "second-page-product")],
            }),
          };
        }
        return {
          ok: true,
          json: async () => ({
            count: 2,
            next: "page=2",
            previous: null,
            results: [makeProduct("1", "first-page-product")],
          }),
        };
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads the next page when the sentinel intersects", async () => {
    renderWithQueryClient(<ProductGrid />);

    await waitFor(() => {
      expect(screen.getByText("first-page-product")).toBeInTheDocument();
    });
    expect(screen.queryByText("second-page-product")).not.toBeInTheDocument();

    intersectCallback([{ isIntersecting: true }]);

    await waitFor(() => {
      expect(screen.getByText("second-page-product")).toBeInTheDocument();
    });
  });
});
