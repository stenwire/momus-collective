import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "./page";

const mockProduct = {
  id: "1",
  slogan: "cogito ergo sold out",
  slug: "cogito-ergo-sold-out",
  category: { id: "1", name: "Philosophy", slug: "philosophy" },
  price: 500000,
  mockup_images: ["/mockup.png"],
  tags: ["BESTSELLER"],
  total_orders: 0,
  avg_rating: "0.00",
  created_at: "2026-01-01T00:00:00Z",
};

function renderWithQueryClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

describe("Home", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("/categories/")) {
          return {
            ok: true,
            json: async () => ({ all_count: 1, categories: [] }),
          };
        }
        if (url.includes("/collections/")) {
          return { ok: true, json: async () => [] };
        }
        return {
          ok: true,
          json: async () => ({
            count: 1,
            next: null,
            previous: null,
            results: [mockProduct],
          }),
        };
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders a heading", () => {
    renderWithQueryClient(<Home />);
    expect(
      screen.getByRole("heading", { level: 1 }),
    ).toBeInTheDocument();
  });

  it("gives every image alt text", async () => {
    const { container } = renderWithQueryClient(<Home />);
    await waitFor(() => {
      expect(container.querySelectorAll("img").length).toBeGreaterThan(0);
    });
    const images = Array.from(container.querySelectorAll("img"));
    for (const img of images) {
      expect(img).toHaveAttribute("alt");
      expect(img.getAttribute("alt")).not.toBe("");
    }
  });
});
