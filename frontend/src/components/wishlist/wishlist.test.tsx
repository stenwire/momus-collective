import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCartDrawer } from "@/lib/cart/drawer-store";
import type { WishlistEntry } from "@/lib/wishlist/api";
import { signedIn, signedOut } from "@/test/auth";
import { Wishlist } from "./wishlist";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

const tee = (id: string, extra: Partial<WishlistEntry["product"]> = {}): WishlistEntry => ({
  product: {
    id,
    slug: id,
    slogan: `slogan ${id}`,
    price: 1200000,
    image: null,
    shirt_colors: ["Black", "White"],
    available: true,
    ...extra,
  },
  added_at: "2026-10-11T00:00:00Z",
});

function api(entries: WishlistEntry[], moveStatus = 200) {
  let list = [...entries];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.includes("/move-to-cart/")) {
      if (moveStatus >= 400)
        return { ok: false, status: moveStatus, json: async () => ({ color: ["'Neon' isn't offered for this shirt."] }) } as Response;
      list = list.filter((e) => !url.includes(`/${e.product.id}/`));
    } else if (init?.method === "DELETE") {
      list = list.filter((e) => !url.includes(`/${e.product.id}/`));
    }
    return { ok: true, status: 200, json: async () => list } as Response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderWishlist() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <Wishlist />
    </QueryClientProvider>,
  );
}

describe("Wishlist", () => {
  beforeEach(() => {
    replace.mockClear();
    useCartDrawer.setState({ open: false });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("moves an item to the bag in the chosen size and colour", async () => {
    signedIn();
    const fetchMock = api([tee("p1"), tee("p2")]);
    renderWishlist();
    const item = (await screen.findByRole("link", { name: "slogan p1" })).closest("li")!;
    const move = within(item).getByRole("button", { name: "Move slogan p1 to bag" });
    expect(move).toBeDisabled();
    await userEvent.selectOptions(within(item).getByLabelText("Size"), "L");
    await userEvent.selectOptions(within(item).getByLabelText("Colour"), "White");
    await userEvent.click(move);
    expect(await screen.findByText("Moved slogan p1 to your bag.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "slogan p1" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "slogan p2" })).toBeInTheDocument();
    const call = fetchMock.mock.calls.find(([u]) => u.includes("/move-to-cart/"))!;
    expect(call[0]).toContain("/api/v1/wishlist/p1/move-to-cart/");
    expect(JSON.parse(String(call[1]!.body))).toEqual({ size: "L", color: "White" });
    await userEvent.click(screen.getByRole("button", { name: "View bag" }));
    expect(useCartDrawer.getState().open).toBe(true);
  });

  it("removes an item", async () => {
    signedIn();
    api([tee("p1")]);
    renderWishlist();
    await userEvent.click(await screen.findByRole("button", { name: "Remove slogan p1 from wishlist" }));
    expect(await screen.findByText(/Nothing saved yet/)).toBeInTheDocument();
  });

  it("marks an archived product and offers no move", async () => {
    signedIn();
    api([tee("p1", { available: false })]);
    renderWishlist();
    expect(await screen.findByText("No longer available")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Move .* to bag/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove slogan p1 from wishlist" })).toBeInTheDocument();
  });

  it("shows the server's reason when a move is refused, keeping the item", async () => {
    signedIn();
    api([tee("p1")], 400);
    renderWishlist();
    await userEvent.selectOptions(await screen.findByLabelText("Size"), "M");
    await userEvent.click(screen.getByRole("button", { name: "Move slogan p1 to bag" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("isn't offered for this shirt");
    expect(screen.getByRole("link", { name: "slogan p1" })).toBeInTheDocument();
  });

  it("sends a signed-out visitor to log in", () => {
    signedOut();
    api([]);
    renderWishlist();
    expect(replace).toHaveBeenCalledWith("/login?next=/account/wishlist");
  });
});
