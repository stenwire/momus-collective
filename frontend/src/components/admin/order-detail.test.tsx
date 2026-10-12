import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AdminOrderDetail } from "@/lib/admin/api";
import { useAuthStore } from "@/lib/auth/store";
import { AdminOrderDetailView } from "./order-detail";

const detail: AdminOrderDetail = {
  id: "o1",
  order_number: "MOM-20261011-002",
  status: "printed",
  status_label: "Printed",
  created_at: "2026-10-11T10:00:00Z",
  paid_at: "2026-10-11T10:01:00Z",
  customer: { name: "Ada Lovelace", phone: "+2348000000000", email: "ada@example.com", has_account: false },
  shipping_address: {
    full_name: "Ada Lovelace",
    address_line_1: "12 Admiralty Way",
    city: "Lekki",
    lga: "Eti-Osa",
    state: "Lagos",
    notes: "Gate code 4421",
  },
  items: [
    {
      id: "i1",
      kind: "product",
      slogan_text: "war bad naps good",
      size: "S",
      color: "Black",
      quantity: 1,
      unit_price: 1200000,
      line_total: 1200000,
      product: { slug: "war-bad-naps-good", image: null },
      design_config: null,
      design_file_url: null,
    },
    {
      id: "i2",
      kind: "design",
      slogan_text: "I'M NOT ARGUING",
      size: "L",
      color: "Black",
      quantity: 1,
      unit_price: 1250000,
      line_total: 1250000,
      product: null,
      design_config: null,
      design_file_url: "http://api.test/api/v1/orders/items/i2/design-file/",
    },
  ],
  payment: {
    reference: "MOMPAY-abc",
    subtotal: 2450000,
    delivery_fee: 300000,
    discount: 100000,
    promo_code: "NAPS20",
    total: 2650000,
    payment_fee: 0,
    amount_paid: 2650000,
  },
  status_history: [
    { status: "paid", label: "Paid", timestamp: "2026-10-11T10:01:00Z" },
    { status: "printed", label: "Printed", timestamp: "2026-10-11T15:00:00Z", by: "owner@momus.test", note: "Printed at Yaba" },
  ],
  notes: "",
  tracking_url: "http://localhost:3000/track/tok",
};

function api(order: AdminOrderDetail = detail) {
  let current = order;
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === "PATCH" && url.includes("/status/")) {
      current = { ...current, status: JSON.parse(String(init.body)).status };
      return { ok: true, status: 200, json: async () => ({}) } as Response;
    }
    if (init?.method === "PATCH") {
      current = { ...current, notes: JSON.parse(String(init.body)).notes };
    }
    return { ok: true, status: 200, json: async () => current } as Response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderDetail() {
  useAuthStore.setState({ status: "signed-in", user: { email: "o@example.com", first_name: "O", is_staff: true }, csrf: "t" });
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <AdminOrderDetailView id="o1" />
    </QueryClientProvider>,
  );
}

const section = (name: string) => screen.getByRole("region", { name });

describe("AdminOrderDetailView", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("shows everything needed to fulfil the order", async () => {
    api();
    renderDetail();
    expect(await screen.findByRole("heading", { name: "MOM-20261011-002" })).toBeInTheDocument();
    const customer = section("Customer");
    expect(within(customer).getByText(/Ada Lovelace/)).toBeInTheDocument();
    expect(within(customer).getByText("(guest)")).toBeInTheDocument();
    expect(within(customer).getByRole("link", { name: "+2348000000000" })).toHaveAttribute("href", "tel:+2348000000000");
    expect(within(customer).getByRole("link", { name: "ada@example.com" })).toHaveAttribute("href", "mailto:ada@example.com");
    expect(within(section("Ship to")).getByText("Lekki, Eti-Osa, Lagos")).toBeInTheDocument();
    expect(within(section("Ship to")).getByText("Delivery notes: Gate code 4421")).toBeInTheDocument();
    const items = section("Items");
    expect(within(items).getByText("Custom: “I'M NOT ARGUING”")).toBeInTheDocument();
    expect(within(items).getAllByRole("link", { name: "Download print file" })).toHaveLength(1);
    expect(within(items).getByRole("link", { name: "Download print file" })).toHaveAttribute(
      "href",
      "http://api.test/api/v1/orders/items/i2/design-file/",
    );
    const payment = section("Payment");
    expect(within(payment).getByText("MOMPAY-abc")).toBeInTheDocument();
    expect(within(payment).getByText("Discount (NAPS20)")).toBeInTheDocument();
    expect(within(payment).getByText("₦26,500")).toBeInTheDocument();
    const timeline = section("Timeline");
    expect(within(timeline).getAllByRole("listitem").map((li) => li.textContent?.split(" · ")[0])).toEqual(["Paid", "Printed"]);
    expect(within(timeline).getByText(/owner@momus.test/)).toBeInTheDocument();
    expect(within(timeline).getByText("Printed at Yaba")).toBeInTheDocument();
    expect(screen.getByLabelText("Status")).toHaveValue("printed");
  });

  it("shows Paystack's fee and the total paid when the customer bore it", async () => {
    api({ ...detail, payment: { ...detail.payment, payment_fee: 52031, amount_paid: 2702031 } });
    renderDetail();
    const payment = await screen.findByRole("region", { name: "Payment" });
    expect(within(payment).getByText("Order total").nextSibling).toHaveTextContent("₦26,500");
    expect(within(payment).getByText("Paystack fee (paid by the customer)").nextSibling).toHaveTextContent("₦520.31");
    expect(within(payment).getByText("Total paid").nextSibling).toHaveTextContent("₦27,020.31");
  });

  it("shows no fee lines without a fee", async () => {
    api();
    renderDetail();
    const payment = await screen.findByRole("region", { name: "Payment" });
    expect(within(payment).queryByText("Total paid")).not.toBeInTheDocument();
  });

  it("saves internal notes", async () => {
    const fetchMock = api();
    renderDetail();
    const notes = await screen.findByLabelText("Only staff see these.");
    const save = screen.getByRole("button", { name: "Save notes" });
    expect(save).toBeDisabled();
    await userEvent.type(notes, "Call before delivery");
    await userEvent.click(save);
    expect(await screen.findByText("Notes saved.")).toBeInTheDocument();
    const patch = fetchMock.mock.calls.find(([u, init]) => init?.method === "PATCH" && !u.includes("/status/"))!;
    expect(JSON.parse(String(patch[1]!.body))).toEqual({ notes: "Call before delivery" });
  });

  it("changes the status from the detail page", async () => {
    const fetchMock = api();
    renderDetail();
    await userEvent.selectOptions(await screen.findByLabelText("Status"), "out_for_delivery");
    await waitFor(() => expect(screen.getByLabelText("Status")).toHaveValue("out_for_delivery"));
    const patch = fetchMock.mock.calls.find(([u]) => u.includes("/status/"))!;
    expect(JSON.parse(String(patch[1]!.body))).toEqual({ status: "out_for_delivery" });
  });

  it("offers no status menu while a design awaits moderation", async () => {
    api({ ...detail, status: "moderation", status_label: "Moderation" });
    renderDetail();
    expect(await screen.findByText("Status: Moderation")).toBeInTheDocument();
    expect(screen.queryByLabelText("Status")).not.toBeInTheDocument();
  });
});
