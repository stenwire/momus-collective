import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { CollectionCarousel } from "@/components/catalog/collection-carousel";
import { Hero } from "@/components/hero";
import type { Collection, Product } from "@/lib/api";
import { RavenTilt } from "./raven-tilt";
import { SloganMarquee } from "./slogan-marquee";

function product(id: string, slogan: string): Product {
  return {
    id,
    slogan,
    slug: id,
    category: { id: "c", name: "Philosophy", slug: "philosophy" },
    price: 1200000,
    mockup_images: [],
    tags: [],
    total_orders: 0,
    avg_rating: "0.00",
    review_count: 0,
    created_at: "2026-01-01T00:00:00Z",
  } as Product;
}

function collection(products: Product[]): Collection {
  return { id: "1", name: "Top Rated", slug: "top-rated", is_featured: true, products };
}

function withCollections(data: Collection[], ui: ReactNode) {
  const client = new QueryClient();
  client.setQueryData(["collections"], data);
  return <QueryClientProvider client={client}>{ui}</QueryClientProvider>;
}

describe("Hero", () => {
  it("reads the tagline as one heading and strikes through 'filtered out'", () => {
    render(<Hero />);
    expect(
      screen.getByRole("heading", { level: 1, name: "dressed up, filtered out." }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("strike")).toHaveClass("animate-strike");
    expect(screen.getByRole("link", { name: "Design your own" })).toHaveAttribute("href", "/design");
  });
});

describe("RavenTilt", () => {
  it("renders still under reduced motion", () => {
    render(
      <MotionConfig reducedMotion="always">
        <RavenTilt>
          <p>raven</p>
        </RavenTilt>
      </MotionConfig>,
    );
    expect(screen.queryByTestId("raven-tilt")).not.toBeInTheDocument();
    expect(screen.getByText("raven")).toBeInTheDocument();
  });
});

describe("SloganMarquee", () => {
  it("runs the shop's slogans once each", () => {
    const data = [
      collection([product("1", "war bad naps good"), product("2", "cogito ergo sold out")]),
      collection([product("1", "war bad naps good")]),
    ];
    render(withCollections(data, <SloganMarquee />));
    const region = screen.getByRole("region", { name: "Slogans in the shop" });
    expect(region.querySelectorAll("ul:not([aria-hidden]) li")).toHaveLength(2);
  });

  it("stays out of the way with fewer than two slogans", () => {
    render(withCollections([collection([product("1", "alone")])], <SloganMarquee />));
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });
});

describe("CollectionCarousel controls", () => {
  it("pages the track with the arrow buttons", async () => {
    const scrollBy = vi.fn();
    Element.prototype.scrollBy = scrollBy;
    // jsdom lays nothing out, so every clientWidth is 0.
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(320);
    render(<CollectionCarousel collection={collection([product("1", "a"), product("2", "b")])} />);
    expect(screen.getByRole("heading", { name: /Top Rated/ })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Next in Top Rated" }));
    await userEvent.click(screen.getByRole("button", { name: "Previous in Top Rated" }));
    expect(scrollBy.mock.calls.map(([arg]) => Math.sign(arg.left))).toEqual([1, -1]);
  });
});
