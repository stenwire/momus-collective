import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ShopCategoryPage, { generateMetadata } from "./page";

vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();
  return { ...actual, useRouter: () => ({ push: vi.fn() }) };
});

const categoriesResponse = {
  all_count: 1,
  categories: [
    { id: "1", name: "Philosophy", slug: "philosophy", product_count: 1 },
  ],
};

describe("ShopCategoryPage", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("/categories/")) {
          return { ok: true, json: async () => categoriesResponse };
        }
        return {
          ok: true,
          json: async () => ({
            count: 0,
            next: null,
            previous: null,
            results: [],
          }),
        };
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("generates metadata naming the category", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ category: "philosophy" }),
    });
    expect(metadata.title).toBe("Philosophy | momus collective");
  });

  it("falls back to a not-found title for an unknown category", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ category: "not-a-category" }),
    });
    expect(metadata.title).toBe("Category not found");
  });

  it("renders a heading naming the category", async () => {
    const element = await ShopCategoryPage({
      params: Promise.resolve({ category: "philosophy" }),
    });
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>{element}</QueryClientProvider>,
    );
    expect(
      screen.getByRole("heading", { name: "Philosophy" }),
    ).toBeInTheDocument();
  });
});
