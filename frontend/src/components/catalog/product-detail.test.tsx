import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProductDetailView } from "./product-detail";
import type { ProductDetail } from "@/lib/api";

const product: ProductDetail = {
  id: "1",
  slogan: "cogito ergo sold out",
  slug: "cogito",
  category: { id: "1", name: "Philosophy", slug: "philosophy" },
  price: 500000,
  mockup_images: ["/mockup.png"],
  tags: ["BESTSELLER"],
  total_orders: 0,
  avg_rating: "0.00",
  created_at: "2026-01-01T00:00:00Z",
  description: "100% cotton, 180 GSM. Machine wash cold.",
  shirt_colors: ["Black", "White"],
  related_products: [
    {
      id: "2",
      slogan: "related product",
      slug: "related",
      category: { id: "1", name: "Philosophy", slug: "philosophy" },
      price: 400000,
      mockup_images: ["/mockup2.png"],
      tags: [],
      total_orders: 0,
      avg_rating: "0.00",
      created_at: "2026-01-01T00:00:00Z",
    },
  ],
};

describe("ProductDetailView", () => {
  it("renders all five sizes as selectable buttons", () => {
    render(<ProductDetailView product={product} />);
    for (const size of ["S", "M", "L", "XL", "XXL"]) {
      expect(screen.getByRole("button", { name: size })).toBeInTheDocument();
    }
  });

  it("renders a button for every shirt color", () => {
    render(<ProductDetailView product={product} />);
    expect(screen.getByRole("button", { name: "Black" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "White" })).toBeInTheDocument();
  });

  it("renders the price, description and an Add to Bag button", () => {
    render(<ProductDetailView product={product} />);
    expect(screen.getByText(/₦5,000/)).toBeInTheDocument();
    expect(screen.getByText(/180 GSM/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add to Bag" }),
    ).toBeInTheDocument();
  });

  it("renders up to 4 related products", () => {
    render(<ProductDetailView product={product} />);
    expect(screen.getByText("related product")).toBeInTheDocument();
  });

  it("gives every image alt text", () => {
    const { container } = render(<ProductDetailView product={product} />);
    const images = Array.from(container.querySelectorAll("img"));
    expect(images.length).toBeGreaterThan(0);
    for (const img of images) {
      expect(img.getAttribute("alt")).not.toBe("");
    }
  });
});
