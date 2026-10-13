import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Analytics } from "@/lib/admin/api";
import { useAuthStore } from "@/lib/auth/store";
import { AnalyticsDashboard } from "./analytics-dashboard";

const trend = Array.from({ length: 30 }, (_, i) => ({
  date: `2026-09-${String(15 + i).padStart(2, "0")}`.replace(/2026-09-(3[1-9]|4\d)/, (m, d) => `2026-10-${String(Number(d) - 30).padStart(2, "0")}`),
  revenue: i === 29 ? 1000000 : i === 5 ? 8000000 : 0,
  orders: i === 29 || i === 5 ? 1 : 0,
}));

const data: Analytics = {
  revenue: { today: 1000000, week: 3000000, month: 7000000, all_time: 15000000 },
  average_order_value: 3750000,
  orders_by_status: [
    { status: "paid", label: "Paid", count: 2 },
    { status: "printed", label: "Printed", count: 1 },
  ],
  top_products: [
    { id: "p2", slug: "p2", slogan: "p two", quantity: 6, orders: 2 },
    { id: "p1", slug: "p1", slogan: "p one", quantity: 3, orders: 2 },
  ],
  categories: [
    { name: "Philosophy", orders: 2, quantity: 3 },
    { name: "Tech", orders: 2, quantity: 6 },
  ],
  custom_vs_catalog: { custom: 1, catalog: 3 },
  trend,
};

function renderDashboard(body: Analytics = data) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => body }));
  useAuthStore.setState({ status: "signed-in", user: { email: "o@example.com", first_name: "O", is_staff: true }, csrf: "t" });
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <AnalyticsDashboard />
    </QueryClientProvider>,
  );
}

const card = (name: string) => screen.getByRole("region", { name });

describe("AnalyticsDashboard", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("shows revenue by period and the average order value", async () => {
    renderDashboard();
    const revenue = await screen.findByRole("region", { name: "Revenue" });
    for (const [label, value] of [
      ["Today", "₦10,000"],
      ["This week", "₦30,000"],
      ["This month", "₦70,000"],
      ["All time", "₦150,000"],
      ["Average order value", "₦37,500"],
    ]) {
      expect(within(revenue).getByText(label).nextSibling).toHaveTextContent(value);
    }
  });

  it("draws the 30-day trend with a text summary and the numbers on request", async () => {
    renderDashboard();
    const chart = await screen.findByRole("img", { name: /Daily revenue for the last 30 days/ });
    expect(chart.getAttribute("aria-label")).toContain("₦90,000 in total, highest ₦80,000 on 20 Sept");
    await userEvent.click(screen.getByText("Show the numbers"));
    const table = screen.getByRole("table", { name: "Revenue and orders per day" });
    expect(within(table).getAllByRole("row")).toHaveLength(31);
  });

  it("lists the top products, categories, statuses and custom share", async () => {
    renderDashboard();
    const top = await screen.findByRole("region", { name: "Top 10 products" });
    expect(within(top).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "p two · 6 sold in 2 orders",
      "p one · 3 sold in 2 orders",
    ]);
    expect(within(top).getByRole("link", { name: "p two" })).toHaveAttribute("href", "/product/p2");
    expect(within(card("Orders by category")).getByText("2 orders · 6 shirts")).toBeInTheDocument();
    expect(within(card("Orders by status")).getByText("Printed")).toBeInTheDocument();
    expect(within(card("Custom vs catalog")).getByText("1 custom · 3 catalog (25% custom)")).toBeInTheDocument();
  });

  it("copes with a store that hasn't sold anything", async () => {
    renderDashboard({
      ...data,
      revenue: { today: 0, week: 0, month: 0, all_time: 0 },
      average_order_value: 0,
      top_products: [],
      categories: [],
      custom_vs_catalog: { custom: 0, catalog: 0 },
      trend: trend.map((d) => ({ ...d, revenue: 0, orders: 0 })),
    });
    expect(await screen.findAllByText("No catalog sales yet.")).toHaveLength(2);
    expect(screen.getByText("0 custom · 0 catalog")).toBeInTheDocument();
  });
});
