import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as home from "@/app/page";
import * as shop from "@/app/shop/page";
import {
  CATALOG_REVALIDATE_SECONDS,
  fetchCategories,
  fetchCollections,
  fetchProduct,
  fetchProducts,
} from "./api";

describe("catalog freshness (T-221)", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) }),
    );
  });

  afterEach(() => vi.unstubAllGlobals());

  it.each([
    ["products", () => fetchProducts()],
    ["product", () => fetchProduct("x")],
    ["categories", () => fetchCategories()],
    ["collections", () => fetchCollections()],
  ])("%s may be cached for at most a minute", async (_name, call) => {
    await call();
    expect(fetch).toHaveBeenCalledWith(expect.any(String), {
      next: { revalidate: CATALOG_REVALIDATE_SECONDS },
    });
  });

  it("the homepage and shop regenerate on the same window", () => {
    expect(home.revalidate).toBe(CATALOG_REVALIDATE_SECONDS);
    expect(shop.revalidate).toBe(CATALOG_REVALIDATE_SECONDS);
  });
});
