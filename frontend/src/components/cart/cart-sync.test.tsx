import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/lib/auth/store";
import { useGuestCart } from "@/lib/cart/guest-store";
import { signedIn, signedOut } from "@/test/auth";
import { CartSync } from "./cart-sync";

const product = { id: "p1", slug: "tg", slogan: "touch grass", image: null, price: 1500000 };
const json = (body: unknown, status = 200) =>
  ({ ok: status < 400, status, json: async () => body }) as Response;

function renderSync(client = new QueryClient()) {
  render(
    <QueryClientProvider client={client}>
      <CartSync />
    </QueryClientProvider>,
  );
  return client;
}

describe("CartSync", () => {
  beforeEach(() => {
    localStorage.clear();
    useGuestCart.setState({ lines: [] });
    useGuestCart.getState().add({ product, size: "M", color: "Black", quantity: 2 });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("does nothing while signed out", () => {
    signedOut();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderSync();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(useGuestCart.getState().lines).toHaveLength(1);
  });

  it("merges the guest lines on sign-in, then clears them", async () => {
    signedOut();
    const merged = { items: [], item_count: 5, subtotal: 7500000, skipped: [] };
    const fetchMock = vi.fn().mockResolvedValue(json(merged));
    vi.stubGlobal("fetch", fetchMock);
    const client = renderSync();
    act(() => signedIn());
    await waitFor(() => expect(useGuestCart.getState().lines).toEqual([]));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/v1\/cart\/merge\/$/);
    expect(JSON.parse(init.body)).toEqual({
      items: [{ product: "p1", size: "M", color: "Black", quantity: 2 }],
    });
    expect(client.getQueryData(["cart"])).toMatchObject({ item_count: 5 });
  });

  it("keeps the guest lines when the merge fails", async () => {
    signedIn();
    const fetchMock = vi.fn().mockResolvedValue(json({ detail: "boom" }, 500));
    vi.stubGlobal("fetch", fetchMock);
    renderSync();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 10));
    expect(useGuestCart.getState().lines).toHaveLength(1);
    expect(useAuthStore.getState().status).toBe("signed-in");
  });
});
