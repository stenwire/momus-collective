import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AdminRow } from "@/lib/admin/api";
import { useAuthStore } from "@/lib/auth/store";
import { OrderList } from "./order-list";

const row = (n: number, extra: Partial<AdminRow> = {}): AdminRow => ({
  id: `o${n}`,
  order_number: `MOM-20261011-00${n}`,
  status: "paid",
  status_label: "Paid",
  created_at: "2026-10-11T10:00:00Z",
  customer: `Customer ${n}`,
  item_count: 1,
  has_custom: false,
  total: 1500000,
  ...extra,
});

function api(pages: Record<string, { results: AdminRow[]; next: string | null; count: number }>) {
  const fetchMock = vi.fn(async (url: string) => {
    const page = new URL(url).searchParams.get("page") ?? "1";
    return { ok: true, status: 200, json: async () => pages[page] ?? pages["1"] } as Response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const lastParams = (fetchMock: ReturnType<typeof api>) =>
  new URL(fetchMock.mock.calls.at(-1)![0]).searchParams;

function renderList() {
  useAuthStore.setState({ status: "signed-in", user: { email: "o@example.com", first_name: "O", is_staff: true }, csrf: "t" });
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <OrderList />
    </QueryClientProvider>,
  );
}

describe("OrderList", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("lists orders newest first with their status and amount", async () => {
    const fetchMock = api({ "1": { results: [row(2, { has_custom: true }), row(1)], next: null, count: 2 } });
    renderList();
    const table = await screen.findByRole("table", { name: "Orders" });
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows.map((r) => within(r).getAllByRole("cell")[0].textContent)).toEqual([
      "MOM-20261011-002Custom",
      "MOM-20261011-001",
    ]);
    expect(within(rows[0]).getByRole("link")).toHaveAttribute("href", "/admin/orders/o2");
    expect(within(rows[0]).getByText("₦15,000")).toBeInTheDocument();
    expect(screen.getByText("2 orders")).toBeInTheDocument();
    expect(lastParams(fetchMock).get("ordering")).toBe("-date");
    expect(screen.getByRole("columnheader", { name: /Date/ })).toHaveAttribute("aria-sort", "descending");
  });

  it("sorts by a header, toggling direction", async () => {
    const fetchMock = api({ "1": { results: [row(1)], next: null, count: 1 } });
    renderList();
    await screen.findByRole("table");
    await userEvent.click(screen.getByRole("button", { name: /Amount/ }));
    await waitFor(() => expect(lastParams(fetchMock).get("ordering")).toBe("-amount"));
    expect(screen.getByRole("columnheader", { name: /Amount/ })).toHaveAttribute("aria-sort", "descending");
    await userEvent.click(screen.getByRole("button", { name: /Amount/ }));
    await waitFor(() => expect(lastParams(fetchMock).get("ordering")).toBe("amount"));
    expect(screen.getByRole("columnheader", { name: /Amount/ })).toHaveAttribute("aria-sort", "ascending");
    expect(screen.getByRole("columnheader", { name: /Date/ })).toHaveAttribute("aria-sort", "none");
  });

  it("filters by status and searches", async () => {
    const fetchMock = api({ "1": { results: [row(1)], next: null, count: 1 } });
    renderList();
    await screen.findByRole("table");
    await userEvent.selectOptions(screen.getByLabelText("Status"), "printed");
    await waitFor(() => expect(lastParams(fetchMock).get("status")).toBe("printed"));
    await userEvent.type(screen.getByLabelText("Search"), "chiamaka");
    await waitFor(() => expect(lastParams(fetchMock).get("search")).toBe("chiamaka"));
  });

  it("loads more on request", async () => {
    api({
      "1": { results: [row(1)], next: "http://api/?page=2", count: 2 },
      "2": { results: [row(2)], next: null, count: 2 },
    });
    renderList();
    await userEvent.click(await screen.findByRole("button", { name: "Show more" }));
    expect(await screen.findByText("MOM-20261011-002")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Show more" })).not.toBeInTheDocument();
  });
});
