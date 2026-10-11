import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ModerationEntry } from "@/lib/admin/api";
import { useAuthStore } from "@/lib/auth/store";
import { ModerationQueue } from "./moderation-queue";

const entry = (n: number): ModerationEntry => ({
  id: `o${n}`,
  order_number: `MOM-20261011-00${n}`,
  created_at: "2026-10-11T10:00:00Z",
  customer: `Customer ${n}`,
  designs: [
    {
      id: `i${n}`,
      kind: "design",
      slogan_text: `slogan ${n}`,
      size: "L",
      color: "Black",
      quantity: 1,
      unit_price: 1250000,
      line_total: 1250000,
      product: null,
      design_config: null,
      design_file_url: `http://api.test/api/v1/orders/items/i${n}/design-file/`,
    },
  ],
});

function api(entries: ModerationEntry[], approveStatus = 200) {
  let queue = [...entries];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === "POST") {
      if (approveStatus >= 400)
        return { ok: false, status: approveStatus, json: async () => ({ status: "This order isn't awaiting moderation." }) } as Response;
      queue = queue.filter((e) => !url.includes(`/${e.id}/`));
      return { ok: true, status: 200, json: async () => ({ status: "shirt_acquired" }) } as Response;
    }
    return { ok: true, status: 200, json: async () => ({ count: queue.length, orders: queue }) } as Response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderQueue() {
  useAuthStore.setState({ status: "signed-in", user: { email: "o@example.com", first_name: "O", is_staff: true }, csrf: "t" });
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <ModerationQueue />
    </QueryClientProvider>,
  );
}

describe("ModerationQueue", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("lists each waiting order's designs with their print files", async () => {
    api([entry(1), entry(2)]);
    renderQueue();
    expect(await screen.findByText("2 orders waiting, oldest first.")).toBeInTheDocument();
    const first = screen.getByRole("link", { name: "MOM-20261011-001" }).closest("li")!;
    expect(within(first).getByText("“slogan 1”")).toBeInTheDocument();
    expect(within(first).getByRole("link", { name: "Download print file" })).toHaveAttribute(
      "href",
      "http://api.test/api/v1/orders/items/i1/design-file/",
    );
  });

  it("approves an order and removes it from the queue", async () => {
    const fetchMock = api([entry(1)]);
    renderQueue();
    await userEvent.click(await screen.findByRole("button", { name: "Approve MOM-20261011-001" }));
    expect(await screen.findByText("Approved MOM-20261011-001; it's now in Shirt Acquired.")).toBeInTheDocument();
    expect(await screen.findByText(/Nothing to review/)).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([u, init]) => init?.method === "POST" && u.endsWith("/admin/moderation/o1/approve/"))).toBe(true);
  });

  it("explains a refused approval", async () => {
    api([entry(1)], 400);
    renderQueue();
    await userEvent.click(await screen.findByRole("button", { name: "Approve MOM-20261011-001" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("isn't awaiting moderation");
  });
});
