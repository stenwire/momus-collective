import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CartData } from "@/lib/cart/types";
import { designOptions, mockDesignApi } from "@/test/design-fixtures";
import { CartLines } from "./cart-lines";

const cart: CartData = {
  items: [
    {
      id: "l1",
      kind: "product",
      product: { id: "p1", slug: "tg", slogan: "touch grass", image: "/m.png" },
      design: null,
      size: "M",
      color: "Black",
      quantity: 2,
      unit_price: 1500000,
      line_total: 3000000,
    },
    {
      id: "l2",
      kind: "design",
      product: null,
      design: {
        id: "d1",
        name: "mine",
        config: { ...designOptions.defaults, text: "DRESSED UP" },
      },
      size: "L",
      color: "Black",
      quantity: 1,
      unit_price: 1250000,
      line_total: 1250000,
    },
  ],
  item_count: 3,
  subtotal: 4250000,
};

function renderLines(data = cart) {
  const onQuantity = vi.fn();
  const onRemove = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <CartLines cart={data} onQuantity={onQuantity} onRemove={onRemove} />
    </QueryClientProvider>,
  );
  return { onQuantity, onRemove };
}

describe("CartLines", () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    vi.stubGlobal("fetch", mockDesignApi());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("shows each line's thumbnail, title, size, colour, quantity and unit price", async () => {
    renderLines();
    const [product, design] = screen.getAllByRole("listitem");
    expect(within(product).getByRole("img", { name: "touch grass" })).toBeInTheDocument();
    expect(product).toHaveTextContent("touch grass");
    expect(product).toHaveTextContent("Size M · Black");
    expect(product).toHaveTextContent("₦15,000");
    expect(within(product).getByLabelText("Quantity of touch grass")).toHaveTextContent("2");
    expect(design).toHaveTextContent("Custom Design");
    expect(design).toHaveTextContent("“DRESSED UP”");
    expect(
      await within(design).findByRole("img", { name: "Custom design preview: DRESSED UP" }),
    ).toBeInTheDocument();
  });

  it("shows the subtotal and total", () => {
    renderLines();
    expect(screen.getByText("Subtotal").nextSibling).toHaveTextContent("₦42,500");
    expect(screen.getByText("Total").nextSibling).toHaveTextContent("₦42,500");
  });

  it("adjusts quantity with + and − and removes a line", async () => {
    const { onQuantity, onRemove } = renderLines();
    await userEvent.click(screen.getByRole("button", { name: "Increase quantity of touch grass" }));
    expect(onQuantity).toHaveBeenCalledWith("l1", 3);
    await userEvent.click(screen.getByRole("button", { name: "Decrease quantity of touch grass" }));
    expect(onQuantity).toHaveBeenCalledWith("l1", 1);
    await userEvent.click(screen.getByRole("button", { name: "Remove touch grass" }));
    expect(onRemove).toHaveBeenCalledWith("l1");
  });

  it("disables − at 1 and + at 10", () => {
    const edges: CartData = {
      ...cart,
      items: [{ ...cart.items[0], quantity: 1 }, { ...cart.items[1], quantity: 10 }],
    };
    renderLines(edges);
    expect(screen.getByRole("button", { name: "Decrease quantity of touch grass" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Increase quantity of Custom Design" })).toBeDisabled();
  });

  it("says when the bag is empty", () => {
    renderLines({ items: [], item_count: 0, subtotal: 0 });
    expect(screen.getByText("Your bag is empty.")).toBeInTheDocument();
  });
});
