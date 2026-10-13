import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Product } from "@/lib/api";
import { signedOut } from "@/test/auth";
import { ProductCard, productNumber } from "./product-card";
import { Shop } from "./shop";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/shop",
}));

const product = {
  id: "p1",
  slogan: "war bad naps good",
  slug: "war-bad-naps-good",
  category: { id: "c", name: "Philosophy", slug: "philosophy" },
  price: 1200000,
  mockup_images: [],
  tags: ["NEW"],
  total_orders: 0,
  avg_rating: "4.50",
  review_count: 2,
  created_at: "2026-01-01T00:00:00Z",
} as unknown as Product;

function withClient(ui: ReactNode, seed?: (c: QueryClient) => void) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  seed?.(client);
  return <QueryClientProvider client={client}>{ui}</QueryClientProvider>;
}

describe("ProductCard", () => {
  beforeEach(() => signedOut());

  it("numbers the card and prints the slogan when there is no mockup, without repeating it as text", () => {
    const { container } = render(withClient(<ProductCard product={product} index={13} />));
    expect(screen.getByText("№ 014")).toBeInTheDocument();
    expect(screen.getAllByText("war bad naps good")).toHaveLength(1);
    const print = container.querySelector("[data-slogan]");
    expect(print).toHaveAttribute("data-slogan", "war bad naps good");
    expect(print).toHaveAttribute("aria-hidden", "true");
    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/product/war-bad-naps-good");
  });

  it("staggers each page of cards from its own start", () => {
    const { container } = render(withClient(<ProductCard product={product} index={21} />));
    expect((container.firstElementChild as HTMLElement).style.animationDelay).toBe("40ms");
    expect(productNumber(0)).toBe("№ 001");
  });
});

describe("Shop", () => {
  beforeEach(() => {
    push.mockClear();
    signedOut();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => ({
        ok: true,
        json: async () =>
          url.includes("/categories/")
            ? { all_count: 1, categories: [{ id: "c", name: "Tech", slug: "tech", product_count: 0 }] }
            : { results: [], next: null },
      })),
    );
  });

  it("moves the selection at once, then navigates", async () => {
    render(withClient(<Shop />));
    const tech = await screen.findByRole("button", { name: "Tech (0)" });
    expect(screen.getByRole("button", { name: "All (1)" })).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(tech);

    expect(tech).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "All (1)" })).toHaveAttribute("aria-pressed", "false");
    expect(push).toHaveBeenCalledWith("/shop/tech");
  });

  it("shows the raven when nothing matches", async () => {
    render(withClient(<Shop />));
    expect(await screen.findByText("Nothing to mock here.")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /raven/i })).toBeInTheDocument();
  });
});
