import { beforeEach, describe, expect, it } from "vitest";
import { guestCartData, useGuestCart } from "./guest-store";

const product = { id: "p1", slug: "tg", slogan: "touch grass", image: null, price: 1500000 };

describe("guest cart", () => {
  beforeEach(() => {
    localStorage.clear();
    useGuestCart.setState({ lines: [] });
  });

  it("persists lines to localStorage so a refresh keeps them", () => {
    useGuestCart.getState().add({ product, size: "M", color: "Black", quantity: 2 });
    const stored = JSON.parse(localStorage.getItem("momus-cart") ?? "{}");
    expect(stored.state.lines).toHaveLength(1);
    expect(stored.state.lines[0]).toMatchObject({ size: "M", quantity: 2 });
  });

  it("merges the same product, size and colour into one line, capped at 10", () => {
    const { add } = useGuestCart.getState();
    add({ product, size: "M", color: "Black", quantity: 7 });
    add({ product, size: "M", color: "Black", quantity: 7 });
    add({ product, size: "L", color: "Black", quantity: 1 });
    const lines = useGuestCart.getState().lines;
    expect(lines).toHaveLength(2);
    expect(lines[0].quantity).toBe(10);
  });

  it("updates and removes lines", () => {
    useGuestCart.getState().add({ product, size: "M", color: "Black", quantity: 1 });
    const id = useGuestCart.getState().lines[0].id;
    useGuestCart.getState().setQuantity(id, 4);
    expect(useGuestCart.getState().lines[0].quantity).toBe(4);
    useGuestCart.getState().remove(id);
    expect(useGuestCart.getState().lines).toEqual([]);
  });

  it("totals for display", () => {
    useGuestCart.getState().add({ product, size: "M", color: "Black", quantity: 3 });
    expect(guestCartData(useGuestCart.getState().lines)).toMatchObject({
      item_count: 3,
      subtotal: 4500000,
    });
  });
});
