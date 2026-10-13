import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AdminCard, BoardColumn } from "@/lib/admin/api";
import type { OrderStatus } from "@/lib/orders/types";
import { useAuthStore } from "@/lib/auth/store";
import { OrderBoard } from "./order-board";

const LABELS: [OrderStatus, string][] = [
  ["paid", "Paid"],
  ["shirt_acquired", "Shirt Acquired"],
  ["printed", "Printed"],
  ["out_for_delivery", "Out for Delivery"],
  ["delivered", "Delivered"],
  ["cancelled", "Cancelled"],
];

const card = (n: number, status: OrderStatus, extra: Partial<AdminCard> = {}): AdminCard => ({
  id: `o${n}`,
  order_number: `MOM-20261011-00${n}`,
  status,
  created_at: "2026-10-11T10:00:00Z",
  customer: `Customer ${n}`,
  item_count: 2,
  has_custom: false,
  total: 2750000,
  ...extra,
});

function board(cards: AdminCard[], counts: Partial<Record<OrderStatus, number>> = {}): { columns: BoardColumn[] } {
  return {
    columns: LABELS.map(([status, label]) => {
      const orders = cards.filter((c) => c.status === status);
      return { status, label, orders, count: counts[status] ?? orders.length };
    }),
  };
}

function api(initial: { columns: BoardColumn[] }, patchStatus = 200) {
  let cards = initial.columns.flatMap((c) => c.orders);
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === "PATCH") {
      if (patchStatus >= 400)
        return { ok: false, status: patchStatus, json: async () => ({ status: "This design is awaiting moderation; review it first." }) } as Response;
      const { status } = JSON.parse(String(init.body));
      cards = cards.map((c) => (url.includes(`/${c.id}/`) ? { ...c, status } : c));
      return { ok: true, status: 200, json: async () => ({}) } as Response;
    }
    const counts = Object.fromEntries(initial.columns.map((c) => [c.status, c.count]));
    return { ok: true, status: 200, json: async () => board(cards, counts.delivered > 1 ? { delivered: counts.delivered } : {}) } as Response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderBoard() {
  useAuthStore.setState({ status: "signed-in", user: { email: "o@example.com", first_name: "O", is_staff: true }, csrf: "t" });
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <OrderBoard />
    </QueryClientProvider>,
  );
}

const column = (name: string) => screen.getByRole("region", { name: new RegExp(`^${name}`) });

describe("OrderBoard", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("shows the six columns with counts and cards", async () => {
    api(board([card(1, "paid", { has_custom: true }), card(2, "printed")], { delivered: 120 }));
    renderBoard();
    await screen.findByText("MOM-20261011-001");
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.firstChild?.textContent)).toEqual(
      LABELS.map(([, label]) => label),
    );
    const paid = column("Paid");
    expect(within(paid).getByRole("link", { name: "MOM-20261011-001" })).toHaveAttribute("href", "/admin/orders/o1");
    expect(within(paid).getByText("Customer 1")).toBeInTheDocument();
    expect(within(paid).getByText("Custom")).toBeInTheDocument();
    expect(within(paid).getByText(/2 items · ₦27,500/)).toBeInTheDocument();
    expect(within(column("Delivered")).getByText("120")).toBeInTheDocument();
    expect(within(paid).getByRole("button", { name: "Drag MOM-20261011-001" })).toBeInTheDocument();
  });

  it("moves a card from its menu, saving the new status", async () => {
    const fetchMock = api(board([card(1, "paid")]));
    renderBoard();
    await userEvent.selectOptions(await screen.findByLabelText("Move MOM-20261011-001 to"), "printed");
    expect(within(column("Printed")).getByText("MOM-20261011-001")).toBeInTheDocument();
    expect(within(column("Paid")).queryByText("MOM-20261011-001")).not.toBeInTheDocument();
    const patch = fetchMock.mock.calls.find(([, init]) => init?.method === "PATCH")!;
    expect(patch[0]).toContain("/api/v1/admin/orders/o1/status/");
    expect(JSON.parse(String(patch[1]!.body))).toEqual({ status: "printed" });
  });

  it("puts the card back and explains when the server refuses", async () => {
    api(board([card(1, "paid")]), 400);
    renderBoard();
    await userEvent.selectOptions(await screen.findByLabelText("Move MOM-20261011-001 to"), "printed");
    expect(await screen.findByRole("alert")).toHaveTextContent("awaiting moderation");
    expect(within(column("Paid")).getByText("MOM-20261011-001")).toBeInTheDocument();
  });
});
