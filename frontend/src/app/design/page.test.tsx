import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { designOptions } from "@/test/design-fixtures";
import DesignPage, { metadata } from "./page";

describe("DesignPage", () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => designOptions }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("has its own title", () => {
    expect(metadata.title).toBe("Design your own | momus collective");
  });

  it("server-prefetches the options and renders the tool", async () => {
    const element = await DesignPage();
    render(
      <QueryClientProvider client={new QueryClient()}>{element}</QueryClientProvider>,
    );
    expect(
      screen.getByRole("heading", { name: "Design your own" }),
    ).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/designs/options/"),
      { cache: "no-store" },
    );
  });
});
