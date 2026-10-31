import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signedIn } from "@/test/auth";
import { AdminCategories } from "./categories";
import { AdminDesignPricing } from "./design-pricing";

const json = (status: number, body: unknown) =>
  ({ ok: status < 400, status, json: async () => body }) as Response;

const wrap = (ui: React.ReactElement) =>
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);

describe("admin catalog screens", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    signedIn();
    fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes("/admin/categories/")) {
        if (init?.method === "PATCH") return json(200, { ...JSON.parse(String(init.body)), id: "c1" });
        return json(200, [{ id: "c1", name: "Tees", slug: "tees", description: "", display_order: 0, is_active: true }]);
      }
      if (url.includes("/admin/design-pricing/")) {
        if (init?.method === "PATCH") return json(200, JSON.parse(String(init.body)));
        return json(200, { print_cost: 150000, margin: 200000, blank_costs: { Black: 300000 } });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("renames a category", async () => {
    wrap(<AdminCategories />);
    await userEvent.click(await screen.findByRole("button", { name: "Edit Tees" }));
    const name = screen.getByLabelText("Name");
    await userEvent.clear(name);
    await userEvent.type(name, "T-shirts");
    await userEvent.click(screen.getByRole("button", { name: "Save category" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Saved T-shirts");
  });

  it("sends custom pricing in kobo", async () => {
    wrap(<AdminDesignPricing />);
    const margin = await screen.findByLabelText("Margin (₦)");
    await userEvent.clear(margin);
    await userEvent.type(margin, "2500");
    await userEvent.click(screen.getByRole("button", { name: "Save pricing" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Pricing saved");
    const [, request] = fetchMock.mock.calls.find(([, init]) => init?.method === "PATCH")!;
    expect(JSON.parse(request.body as string)).toEqual({ print_cost: 150000, margin: 250000, blank_costs: { Black: 300000 } });
  });
});
