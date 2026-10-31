import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PaidStamp } from "@/components/checkout/paid-stamp";
import { Toaster } from "@/components/ui/toaster";
import { useCartDrawer } from "@/lib/cart/drawer-store";
import { useGuestCart } from "@/lib/cart/guest-store";
import { lineToAdd } from "@/lib/cart/use-remove-with-undo";
import { MAX_LINE_QUANTITY, type CartLine } from "@/lib/cart/types";
import { useToasts } from "@/lib/toast";
import { signedOut } from "@/test/auth";
import { CartDrawer } from "./cart-drawer";

const haptic = vi.fn();
vi.mock("@/lib/haptics", () => ({ haptic: (p: string) => haptic(p) }));

const product = { id: "p1", slug: "tg", slogan: "touch grass", image: null, price: 1500000 };

function renderBag() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <CartDrawer />
      <Toaster />
    </QueryClientProvider>,
  );
  act(() => useCartDrawer.getState().setOpen(true));
}

beforeEach(() => {
  localStorage.clear();
  signedOut();
  haptic.mockClear();
  useGuestCart.setState({ lines: [] });
  useToasts.setState({ toasts: [] });
});

describe("removing with undo", () => {
  it("removes at once and puts the same line back on Undo", async () => {
    useGuestCart.getState().add({ product, size: "L", color: "White", quantity: 3 });
    renderBag();

    await userEvent.click(screen.getByRole("button", { name: "Remove touch grass" }));
    expect(useGuestCart.getState().lines).toEqual([]);
    expect(screen.getByText("touch grass removed.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Undo" }));
    const [line] = useGuestCart.getState().lines;
    expect(line).toMatchObject({ size: "L", color: "White", quantity: 3 });
  });

  it("rebuilds design lines as designs and product lines as products", () => {
    const base = { id: "x", size: "M", color: "Black", quantity: 2, unit_price: 900000, line_total: 0 };
    const design = { id: "d1", name: "mine", config: {} } as CartLine["design"];
    expect(lineToAdd({ ...base, kind: "design", product: null, design } as CartLine)).toEqual({
      design,
      size: "M",
      quantity: 2,
    });
    expect(
      lineToAdd({ ...base, kind: "product", product, design: null } as unknown as CartLine),
    ).toMatchObject({ product: { id: "p1", price: 900000 }, color: "Black", quantity: 2 });
  });
});

describe("quantity cap", () => {
  it("warns with a haptic when a line reaches its limit", async () => {
    useGuestCart.getState().add({ product, size: "M", color: "Black", quantity: MAX_LINE_QUANTITY - 1 });
    renderBag();
    await userEvent.click(screen.getByRole("button", { name: "Increase quantity of touch grass" }));
    expect(haptic).toHaveBeenCalledWith("warning");
    expect(screen.getByRole("button", { name: "Increase quantity of touch grass" })).toBeDisabled();
  });
});

describe("PaidStamp", () => {
  it("is decoration only, with the mask's comedy side behind its tragedy", () => {
    const { container } = render(<PaidStamp />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByTestId("mask")).toHaveClass("animate-flip");
    expect(container.querySelectorAll("svg")).toHaveLength(2);
  });
});
