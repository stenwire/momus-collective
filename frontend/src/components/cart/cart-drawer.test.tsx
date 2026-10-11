import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCartDrawer } from "@/lib/cart/drawer-store";
import { useGuestCart } from "@/lib/cart/guest-store";
import { signedOut } from "@/test/auth";
import { CartButton } from "./cart-button";
import { CartDrawer } from "./cart-drawer";

const product = { id: "p1", slug: "tg", slogan: "touch grass", image: null, price: 1500000 };

function renderBag() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <CartButton />
      <CartDrawer />
    </QueryClientProvider>,
  );
}

describe("bag button and drawer", () => {
  beforeEach(() => {
    localStorage.clear();
    signedOut();
    useCartDrawer.setState({ open: false });
    useGuestCart.setState({ lines: [] });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("badges the item count", () => {
    useGuestCart.getState().add({ product, size: "M", color: "Black", quantity: 3 });
    renderBag();
    expect(screen.getByRole("button", { name: "Bag, 3 items" })).toHaveTextContent("3");
  });

  it("shows no badge for an empty bag", () => {
    renderBag();
    expect(screen.getByRole("button", { name: "Bag, 0 items" })).toHaveTextContent("");
  });

  it("opens the bag, focuses close, and lists the lines", async () => {
    useGuestCart.getState().add({ product, size: "M", color: "Black", quantity: 1 });
    renderBag();
    await userEvent.click(screen.getByRole("button", { name: /Bag, 1 item/ }));
    const dialog = screen.getByRole("dialog", { name: "Your bag" });
    expect(dialog).toHaveTextContent("touch grass");
    expect(screen.getByRole("button", { name: "Close bag" })).toHaveFocus();
    expect(screen.getByRole("link", { name: "Checkout" })).toHaveAttribute("href", "/checkout");
  });

  it("changes quantity from the drawer and the badge follows", async () => {
    useGuestCart.getState().add({ product, size: "M", color: "Black", quantity: 1 });
    renderBag();
    await userEvent.click(screen.getByRole("button", { name: /Bag, 1 item/ }));
    await userEvent.click(screen.getByRole("button", { name: "Increase quantity of touch grass" }));
    expect(useGuestCart.getState().lines[0].quantity).toBe(2);
    expect(screen.getByRole("button", { name: "Bag, 2 items" })).toBeInTheDocument();
  });

  it("closes on Escape and on the backdrop", async () => {
    renderBag();
    act(() => useCartDrawer.getState().setOpen(true));
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    act(() => useCartDrawer.getState().setOpen(true));
    await userEvent.click(screen.getByRole("dialog").parentElement!);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("an empty bag cannot check out", () => {
    renderBag();
    act(() => useCartDrawer.getState().setOpen(true));
    expect(screen.getByRole("button", { name: "Checkout" })).toBeDisabled();
    expect(screen.getByText("Your bag is empty.")).toBeInTheDocument();
  });
});
