import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProductDetail } from "@/lib/api";
import { useSharedMockup } from "@/lib/shared-mockup";
import { signedIn, signedOut } from "@/test/auth";
import { HeartButton } from "../wishlist/heart-button";
import { ProductCard } from "./product-card";
import { ProductDetailView } from "./product-detail";

const haptic = vi.fn();
vi.mock("@/lib/haptics", () => ({ haptic: (p: string) => haptic(p) }));

const flyToBag = vi.fn<(el: HTMLElement | null) => Promise<void>>(() => Promise.resolve());
vi.mock("@/lib/fly-to-bag", () => ({
  BAG_TARGET_ID: "bag-target",
  flyToBag: (el: HTMLElement | null) => flyToBag(el),
}));

const add = vi.fn();
vi.mock("@/lib/cart/use-cart", () => ({ useCart: () => ({ add }) }));

const wishlist: { product: { id: string } }[] = [];
vi.mock("@/lib/wishlist/api", () => ({
  fetchWishlist: async () => wishlist,
  addToWishlist: async (id: string) => {
    wishlist.push({ product: { id } });
    return [...wishlist];
  },
  removeFromWishlist: async () => [],
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/shop",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const product = {
  id: "1",
  slogan: "cogito ergo sold out",
  slug: "cogito",
  category: { id: "1", name: "Philosophy", slug: "philosophy" },
  price: 500000,
  mockup_images: [],
  tags: [],
  total_orders: 0,
  avg_rating: "0.00",
  review_count: 0,
  created_at: "2026-01-01T00:00:00Z",
  description: "",
  shirt_colors: ["Black", "White"],
  related_products: [],
} as unknown as ProductDetail;

function withClient(ui: ReactNode) {
  return <QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>;
}

beforeEach(() => {
  haptic.mockClear();
  flyToBag.mockClear();
  add.mockReset();
  wishlist.length = 0;
  useSharedMockup.setState({ productId: null, owner: null });
});
afterEach(() => vi.useRealTimers());

describe("product view interactions", () => {
  it("ticks on size and colour choice", async () => {
    render(withClient(<ProductDetailView product={product} />));
    await userEvent.click(screen.getByRole("button", { name: "XL" }));
    await userEvent.click(screen.getByRole("button", { name: "White" }));
    expect(haptic.mock.calls).toEqual([["tick"], ["tick"]]);
    expect(screen.getByRole("button", { name: "XL" })).toHaveAttribute("aria-pressed", "true");
  });

  it("bags with a success haptic, flies the mockup, then resets the button", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    add.mockResolvedValue(undefined);
    render(withClient(<ProductDetailView product={product} />));

    await userEvent.click(screen.getByRole("button", { name: "Add to Bag" }));

    expect(await screen.findByRole("button", { name: "Bagged" })).toBeInTheDocument();
    expect(haptic).toHaveBeenCalledWith("success");
    expect(flyToBag).toHaveBeenCalledOnce();
    expect(flyToBag.mock.calls[0][0]).toBeInstanceOf(HTMLElement);
    expect(screen.getByText("Added to your bag.")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1700));
    expect(screen.getByRole("button", { name: "Add to Bag" })).toBeInTheDocument();
  });

  it("buzzes an error and says why when the bag refuses", async () => {
    add.mockRejectedValue(new Error("This shirt is no longer available."));
    render(withClient(<ProductDetailView product={product} />));
    await userEvent.click(screen.getByRole("button", { name: "Add to Bag" }));
    await waitFor(() => expect(haptic).toHaveBeenCalledWith("error"));
    expect(flyToBag).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Add to Bag" })).toBeEnabled();
  });

  it("stamps the product with the brand seal", () => {
    render(withClient(<ProductDetailView product={product} />));
    expect(screen.getByRole("img", { name: "momus collective seal" })).toBeInTheDocument();
  });
});

describe("shared mockup", () => {
  it("lets only the tapped card claim the morph", async () => {
    signedOut();
    render(
      withClient(
        <>
          <ProductCard product={product} index={0} />
          <ProductCard product={product} index={1} />
        </>,
      ),
    );
    const [first] = screen.getAllByRole("link", { name: /Philosophy/ });
    first.addEventListener("click", (e) => e.preventDefault());
    await userEvent.click(first);
    const state = useSharedMockup.getState();
    expect(state.productId).toBe("1");
    expect(state.owner).toBeTruthy();
  });
});

describe("wishlist heart", () => {
  it("bursts laurel leaves and ticks when a shirt is saved", async () => {
    signedIn();
    render(withClient(<HeartButton productId="1" slogan="cogito ergo sold out" />));
    const heart = await screen.findByRole("button", { name: "Save cogito ergo sold out to wishlist" });
    await waitFor(() => expect(heart).toBeEnabled());

    await userEvent.click(heart);

    await waitFor(() => expect(heart).toHaveAttribute("aria-pressed", "true"));
    expect(screen.getAllByTestId("laurel-leaf")).toHaveLength(6);
    expect(haptic).toHaveBeenCalledWith("tick");
  });
});
