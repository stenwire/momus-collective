import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CollectionCarousel } from "./collection-carousel";
import type { Collection } from "@/lib/api";

const product = {
  id: "1",
  slogan: "cogito ergo sold out",
  slug: "cogito",
  category: { id: "1", name: "Philosophy", slug: "philosophy" },
  price: 500000,
  mockup_images: ["/mockup.png"],
  tags: [],
  total_orders: 0,
  avg_rating: "0.00",
  created_at: "2026-01-01T00:00:00Z",
};

describe("CollectionCarousel", () => {
  it("renders the collection name and its products", () => {
    const collection: Collection = {
      id: "1",
      name: "New Drops",
      slug: "new-drops",
      is_featured: false,
      products: [product],
    };
    render(<CollectionCarousel collection={collection} />);
    expect(screen.getByText("New Drops")).toBeInTheDocument();
    expect(screen.getByText("cogito ergo sold out")).toBeInTheDocument();
  });

  it("renders nothing for an empty collection", () => {
    const collection: Collection = {
      id: "1",
      name: "Empty",
      slug: "empty",
      is_featured: false,
      products: [],
    };
    const { container } = render(<CollectionCarousel collection={collection} />);
    expect(container).toBeEmptyDOMElement();
  });
});
