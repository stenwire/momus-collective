import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ProductPage, { generateMetadata } from "./page";

const mockProduct = {
  id: "1",
  slogan: "cogito ergo sold out",
  slug: "cogito",
  category: { id: "1", name: "Philosophy", slug: "philosophy" },
  price: 500000,
  mockup_images: ["https://example.com/mockup.png"],
  tags: [],
  total_orders: 0,
  avg_rating: "0.00",
  created_at: "2026-01-01T00:00:00Z",
  description: "100% cotton, 180 GSM.",
  shirt_colors: ["Black"],
  related_products: [],
};

describe("ProductPage", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockProduct,
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("generates unique metadata naming the product", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "cogito" }),
    });
    expect(metadata.title).toContain("cogito ergo sold out");
    expect(metadata.description).toBe("100% cotton, 180 GSM.");
    expect(metadata.openGraph?.images).toEqual([
      { url: "https://example.com/mockup.png" },
    ]);
  });

  it("falls back to a not-found title for an unknown product", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => null }),
    );
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "nope" }),
    });
    expect(metadata.title).toBe("Product not found");
  });

  it("renders Product JSON-LD with pricing", async () => {
    const element = await ProductPage({
      params: Promise.resolve({ slug: "cogito" }),
    });
    const { container } = render(element);
    const script = container.querySelector(
      'script[type="application/ld+json"]',
    );
    expect(script).not.toBeNull();
    const data = JSON.parse(script!.textContent ?? "{}");
    expect(data["@type"]).toBe("Product");
    expect(data.name).toBe("cogito ergo sold out");
    expect(data.offers.priceCurrency).toBe("NGN");
    expect(data.offers.price).toBe("5000.00");
  });
});
