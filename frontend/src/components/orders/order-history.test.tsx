import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signedIn, signedOut } from "@/test/auth";
import { order } from "@/test/order";
import type { Order } from "@/lib/orders/types";
import { OrderHistory } from "./order-history";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

const newer: Order = {
  ...order,
  order_number: "MOM-20261011-002",
  created_at: "2026-10-11T12:00:00+00:00",
  status: "printed",
  status_label: "Printed",
  tracking_url: "http://localhost:3000/track/tok-2",
  shipping_address: {
    full_name: "Ada Lovelace",
    address_line_1: "12 Admiralty Way",
    city: "Lekki",
    lga: "Eti-Osa",
    state: "Lagos",
    phone: "+2348000000000",
  },
};
const older: Order = { ...order, order_number: "MOM-20261001-001", created_at: "2026-10-01T09:00:00+00:00" };

function api(pages: Record<string, { results: Order[]; next: string | null }>) {
  const fetchMock = vi.fn(async (url: string) => {
    const page = new URL(url).searchParams.get("page") ?? "1";
    return { ok: true, status: 200, json: async () => ({ count: 0, ...pages[page] }) } as Response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderHistory() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <OrderHistory />
    </QueryClientProvider>,
  );
}

describe("OrderHistory", () => {
  beforeEach(() => replace.mockClear());
  afterEach(() => vi.unstubAllGlobals());

  it("lists orders newest first with number, date, item count, total and status", async () => {
    signedIn();
    api({ "1": { results: [newer, older], next: null } });
    renderHistory();
    const headings = await screen.findAllByRole("heading", { level: 2 });
    expect(headings.map((h) => h.textContent)).toEqual(["MOM-20261011-002", "MOM-20261001-001"]);
    const first = headings[0].closest("li")!;
    expect(within(first).getByText("Printed")).toBeInTheDocument();
    expect(within(first).getByText(/11 Oct 2026 · 2 items/)).toBeInTheDocument();
    expect(within(first).getByText("₦21,600")).toBeInTheDocument();
  });

  it("expands an order to its progress, items, address and tracking link", async () => {
    signedIn();
    api({ "1": { results: [newer], next: null } });
    renderHistory();
    const toggle = await screen.findByRole("button", { name: "Show details for MOM-20261011-002" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("list", { name: "Order progress" })).not.toBeInTheDocument();
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    const progress = screen.getByRole("list", { name: "Order progress" });
    expect(within(progress).getByText("Printed")).toHaveAttribute("aria-current", "step");
    expect(screen.getByText("12 Admiralty Way")).toBeInTheDocument();
    expect(screen.getByText("Lekki, Eti-Osa, Lagos")).toBeInTheDocument();
    expect(screen.getByText("Subtotal")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tracking page for MOM-20261011-002" })).toHaveAttribute(
      "href",
      "/track/tok-2",
    );
    await userEvent.click(screen.getByRole("button", { name: "Hide details for MOM-20261011-002" }));
    expect(screen.queryByText("12 Admiralty Way")).not.toBeInTheDocument();
  });

  it("loads older orders on request", async () => {
    signedIn();
    const fetchMock = api({
      "1": { results: [newer], next: "http://api/orders/?page=2" },
      "2": { results: [older], next: null },
    });
    renderHistory();
    await userEvent.click(await screen.findByRole("button", { name: "Show older orders" }));
    expect(await screen.findByText("MOM-20261001-001")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Show older orders" })).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.map(([u]) => new URL(u).search)).toEqual(["?page=1", "?page=2"]);
  });

  it("says so when there are no orders yet", async () => {
    signedIn();
    api({ "1": { results: [], next: null } });
    renderHistory();
    expect(await screen.findByText(/No orders yet/)).toBeInTheDocument();
  });

  it("sends a signed-out visitor to log in and back", () => {
    signedOut();
    api({});
    renderHistory();
    expect(replace).toHaveBeenCalledWith("/login?next=/account/orders");
  });
});
