import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/lib/auth/store";
import { signedIn, signedOut } from "@/test/auth";
import { HeartButton } from "./heart-button";

vi.mock("next/navigation", () => ({ usePathname: () => "/shop" }));

const entry = (id: string) => ({
  product: { id, slug: id, slogan: id, price: 1, image: null, shirt_colors: [], available: true },
  added_at: "2026-10-11T00:00:00Z",
});

function api(initial: string[]) {
  let saved = [...initial];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === "POST") saved = [JSON.parse(String(init.body)).product, ...saved];
    if (init?.method === "DELETE") saved = saved.filter((id) => !url.includes(`/${id}/`));
    return { ok: true, status: 200, json: async () => saved.map(entry) } as Response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderHeart() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <HeartButton productId="p1" slogan="touch grass" />
    </QueryClientProvider>,
  );
}

describe("HeartButton", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("asks a guest to log in and come back", () => {
    signedOut();
    renderHeart();
    expect(screen.getByRole("link", { name: "Log in to save touch grass to your wishlist" })).toHaveAttribute(
      "href",
      "/login?next=%2Fshop",
    );
  });

  it("renders nothing until the session is known", () => {
    useAuthStore.setState({ status: "unknown", user: null });
    const { container } = renderHeart();
    expect(container).toBeEmptyDOMElement();
  });

  it("saves and unsaves for a signed-in customer", async () => {
    signedIn();
    const fetchMock = api([]);
    renderHeart();
    const heart = screen.getByRole("button", { name: "Save touch grass to wishlist" });
    await waitFor(() => expect(heart).toBeEnabled());
    expect(heart).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(heart);
    await waitFor(() => expect(heart).toHaveAttribute("aria-pressed", "true"));
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/wishlist/"),
      expect.objectContaining({ method: "POST", body: JSON.stringify({ product: "p1" }) }),
    );
    await userEvent.click(heart);
    await waitFor(() => expect(heart).toHaveAttribute("aria-pressed", "false"));
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/wishlist/p1/"),
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("shows an already saved product as pressed", async () => {
    signedIn();
    api(["p1"]);
    renderHeart();
    const heart = screen.getByRole("button", { name: "Save touch grass to wishlist" });
    await waitFor(() => expect(heart).toHaveAttribute("aria-pressed", "true"));
  });
});
