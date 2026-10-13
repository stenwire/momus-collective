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
  rejection: null,
});

const REASONS = [
  { key: "offensive", label: "Offensive content" },
  { key: "copyright", label: "Copyright concerns" },
  { key: "unprintable", label: "Unprintable design" },
];

function api(entries: ModerationEntry[], approveStatus = 200, waiting: ModerationEntry[] = []) {
  let queue = [...entries];
  let held = [...waiting];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === "POST" && url.endsWith("/reject/")) {
      const entry = queue.find((e) => url.includes(`/${e.id}/`))!;
      const { reason, details } = JSON.parse(String(init.body));
      queue = queue.filter((e) => e !== entry);
      held = [
        ...held,
        { ...entry, rejection: { reason, reason_label: REASONS.find((r) => r.key === reason)!.label, details, rejected_at: "2026-10-12T09:00:00Z", customer_choice: "" } },
      ];
      return { ok: true, status: 200, json: async () => ({}) } as Response;
    }
    if (init?.method === "POST" && url.endsWith("/refunded/")) {
      held = held.filter((e) => !url.includes(`/${e.id}/`));
      return { ok: true, status: 200, json: async () => ({ status: "refunded" }) } as Response;
    }
    if (init?.method === "POST") {
      if (approveStatus >= 400)
        return { ok: false, status: approveStatus, json: async () => ({ status: "This order isn't awaiting moderation." }) } as Response;
      queue = queue.filter((e) => !url.includes(`/${e.id}/`));
      return { ok: true, status: 200, json: async () => ({ status: "shirt_acquired" }) } as Response;
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ count: queue.length, orders: queue, waiting: held, reasons: REASONS }),
    } as Response;
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

  it("rejects with a reason, telling the admin the customer was emailed", async () => {
    const fetchMock = api([entry(1)]);
    renderQueue();
    await userEvent.click(await screen.findByRole("button", { name: "Reject MOM-20261011-001" }));
    const submit = screen.getByRole("button", { name: "Reject and email the customer" });
    expect(submit).toBeDisabled();
    await userEvent.selectOptions(screen.getByLabelText("Reason"), "unprintable");
    await userEvent.type(screen.getByLabelText(/Details for the customer/), "The text is too small.");
    await userEvent.click(submit);
    expect(await screen.findByText("Rejected MOM-20261011-001; the customer has been emailed.")).toBeInTheDocument();
    const call = fetchMock.mock.calls.find(([u]) => u.endsWith("/reject/"))!;
    expect(JSON.parse(String(call[1]!.body))).toEqual({ reason: "unprintable", details: "The text is too small." });
    const waiting = await screen.findByRole("region", { name: "Waiting on the customer" });
    expect(within(waiting).getByText(/Unprintable design. The text is too small./)).toBeInTheDocument();
    expect(within(waiting).getByText(/Waiting for the customer to revise/)).toBeInTheDocument();
  });

  it("marks a refund once the customer asked for one", async () => {
    const asked: ModerationEntry = {
      ...entry(2),
      rejection: { reason: "offensive", reason_label: "Offensive content", details: "", rejected_at: "2026-10-12T09:00:00Z", customer_choice: "refund" },
    };
    api([], 200, [asked]);
    renderQueue();
    const waiting = await screen.findByRole("region", { name: "Waiting on the customer" });
    expect(within(waiting).getByText(/asked for a refund. Refund it in the Paystack dashboard/)).toBeInTheDocument();
    await userEvent.click(within(waiting).getByRole("button", { name: "Mark MOM-20261011-002 refunded" }));
    expect(await screen.findByText("Marked MOM-20261011-002 as refunded.")).toBeInTheDocument();
  });
});
