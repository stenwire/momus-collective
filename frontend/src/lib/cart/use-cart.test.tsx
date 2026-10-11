import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signedIn, signedOut } from "@/test/auth";
import { useGuestCart } from "./guest-store";
import { useCart } from "./use-cart";

const product = { id: "p1", slug: "tg", slogan: "touch grass", image: null, price: 1500000 };
const serverCart = (quantity: number) => ({
  items: [
    {
      id: "line-1",
      kind: "product",
      product: { id: "p1", slug: "tg", slogan: "touch grass", image: null },
      design: null,
      size: "M",
      color: "Black",
      quantity,
      unit_price: 1500000,
      line_total: 1500000 * quantity,
    },
  ],
  item_count: quantity,
  subtotal: 1500000 * quantity,
});
const json = (body: unknown, status = 200) =>
  ({ ok: status < 400, status, json: async () => body }) as Response;

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

describe("useCart", () => {
  beforeEach(() => {
    localStorage.clear();
    useGuestCart.setState({ lines: [] });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("a guest's cart lives in localStorage, not on the server", async () => {
    signedOut();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useCart(), { wrapper });
    await act(() => result.current.add({ product, size: "M", color: "Black" }));
    expect(result.current.cart.item_count).toBe(1);
    expect(localStorage.getItem("momus-cart")).toContain("touch grass");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("a guest cannot add a custom design", async () => {
    signedOut();
    const { result } = renderHook(() => useCart(), { wrapper });
    const design = { id: "d1", name: "x", config: {} as never };
    await expect(result.current.add({ design, size: "M" })).rejects.toThrow();
  });

  it("a signed-in user's cart is the server's", async () => {
    signedIn();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(serverCart(1)))
      .mockResolvedValueOnce(json(serverCart(2), 201));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useCart(), { wrapper });
    await waitFor(() => expect(result.current.cart.item_count).toBe(1));
    await act(() => result.current.add({ product, size: "M", color: "Black" }));
    await waitFor(() => expect(result.current.cart.item_count).toBe(2));
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toMatch(/\/api\/v1\/cart\/items\/$/);
    expect(JSON.parse(init.body)).toEqual({ product: "p1", size: "M", color: "Black", quantity: 1 });
    expect(localStorage.getItem("momus-cart") ?? "").not.toContain("touch grass");
  });
});
