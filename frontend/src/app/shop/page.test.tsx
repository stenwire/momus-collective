import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ShopPage, { metadata } from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("ShopPage", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ count: 0, next: null, previous: null, results: [] }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("has a Shop title", () => {
    expect(metadata.title).toBe("Shop | momus collective");
  });

  it("renders a Shop heading", async () => {
    const element = await ShopPage();
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>{element}</QueryClientProvider>,
    );
    expect(screen.getByRole("heading", { name: "Shop" })).toBeInTheDocument();
  });
});
