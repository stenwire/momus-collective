import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CustomerDetail, CustomerRow } from "@/lib/admin/api";
import { useAuthStore } from "@/lib/auth/store";
import { CustomerDetailView } from "./customer-detail";
import { CustomerList } from "./customer-list";

const row: CustomerRow = {
  id: "u1",
  name: "Ada Lovelace",
  email: "ada@example.com",
  phone: "+2348011111111",
  order_count: 3,
  total_spent: 3000000,
  last_order_at: "2026-10-11T10:00:00Z",
  joined_at: "2026-09-01T10:00:00Z",
};

function respond(body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => body });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderWith(node: React.ReactNode) {
  useAuthStore.setState({ status: "signed-in", user: { email: "o@example.com", first_name: "O", is_staff: true }, csrf: "t" });
  return render(<QueryClientProvider client={new QueryClient()}>{node}</QueryClientProvider>);
}

describe("CustomerList", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("lists customers with orders, spend and last order, linking to each", async () => {
    respond({ count: 2, next: null, results: [row, { ...row, id: "u2", name: "", email: "new@example.com", order_count: 0, total_spent: 0, last_order_at: null }] });
    renderWith(<CustomerList />);
    const table = await screen.findByRole("table", { name: "Customers" });
    const [ada, fresh] = within(table).getAllByRole("row").slice(1);
    expect(within(ada).getAllByRole("cell").map((c) => c.textContent)).toEqual([
      "Ada Lovelace",
      "ada@example.com",
      "+2348011111111",
      "3",
      "₦30,000",
      "11 Oct 2026",
    ]);
    expect(within(ada).getByRole("link")).toHaveAttribute("href", "/admin/customers/u1");
    expect(within(fresh).getByRole("link", { name: "new@example.com" })).toBeInTheDocument();
    expect(within(fresh).getAllByRole("cell")[5]).toHaveTextContent("—");
  });

  it("sorts and searches", async () => {
    const fetchMock = respond({ count: 1, next: null, results: [row] });
    renderWith(<CustomerList />);
    await screen.findByRole("table");
    await userEvent.selectOptions(screen.getByLabelText("Sort by"), "-spent");
    await waitFor(() => expect(new URL(fetchMock.mock.calls.at(-1)![0]).searchParams.get("ordering")).toBe("-spent"));
    await userEvent.type(screen.getByLabelText("Search"), "obi");
    await waitFor(() => expect(new URL(fetchMock.mock.calls.at(-1)![0]).searchParams.get("search")).toBe("obi"));
  });
});

describe("CustomerDetailView", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("shows contact details, totals and the full order history", async () => {
    const detail: CustomerDetail = {
      ...row,
      notification_pref: "both",
      is_verified: true,
      orders: [
        { id: "o2", order_number: "MOM-20261011-002", status: "delivered", status_label: "Delivered", created_at: "2026-10-11T10:00:00Z", customer: "Ada", item_count: 1, has_custom: false, total: 2000000 },
        { id: "o1", order_number: "MOM-20261001-001", status: "paid", status_label: "Paid", created_at: "2026-10-01T10:00:00Z", customer: "Ada", item_count: 1, has_custom: false, total: 1000000 },
      ],
    };
    respond(detail);
    renderWith(<CustomerDetailView id="u1" />);
    expect(await screen.findByRole("heading", { name: "Ada Lovelace" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "+2348011111111" })).toHaveAttribute("href", "tel:+2348011111111");
    expect(screen.getByText("Order updates by Email and WhatsApp")).toBeInTheDocument();
    expect(screen.getByText("Spent").nextSibling).toHaveTextContent("₦30,000");
    const history = screen.getByRole("region", { name: "Order history" });
    expect(within(history).getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual([
      "/admin/orders/o2",
      "/admin/orders/o1",
    ]);
  });
});
