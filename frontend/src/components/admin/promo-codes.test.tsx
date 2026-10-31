import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PromoCode } from "@/lib/admin/api";
import { useAuthStore } from "@/lib/auth/store";
import { PromoCodes } from "./promo-codes";

const code = (extra: Partial<PromoCode> = {}): PromoCode => ({
  id: "p1",
  code: "NAPS20",
  discount_type: "percentage",
  discount_value: 20,
  min_order_value: 1000000,
  max_uses: 100,
  max_uses_per_user: 1,
  expires_at: null,
  is_active: true,
  uses_count: 2,
  redemptions: 2,
  total_discount: 350000,
  remaining_uses: 98,
  created_at: "2026-10-12T09:00:00Z",
  ...extra,
});

function api(codes: PromoCode[], deleteStatus = 204) {
  let list = [...codes];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    if (method === "DELETE") {
      if (deleteStatus >= 400)
        return { ok: false, status: deleteStatus, json: async () => ({ detail: "This code has been used. Deactivate it instead." }) } as Response;
      list = list.filter((c) => !url.includes(`/${c.id}/`));
      return { ok: true, status: 204, json: async () => ({}) } as Response;
    }
    if (method === "POST") {
      const body = JSON.parse(String(init!.body));
      const created = code({ ...body, id: "new", code: body.code.toUpperCase(), redemptions: 0, total_discount: 0, remaining_uses: body.max_uses });
      list = [created, ...list];
      return { ok: true, status: 201, json: async () => created } as Response;
    }
    if (method === "PATCH") {
      const body = JSON.parse(String(init!.body));
      list = list.map((c) => (url.includes(`/${c.id}/`) ? { ...c, ...body } : c));
      return { ok: true, status: 200, json: async () => list.find((c) => url.includes(`/${c.id}/`)) } as Response;
    }
    return { ok: true, status: 200, json: async () => ({ count: list.length, next: null, results: list }) } as Response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const bodyOf = (fetchMock: ReturnType<typeof api>, method: string) =>
  JSON.parse(String(fetchMock.mock.calls.filter(([, init]) => init?.method === method).at(-1)![1]!.body));

function renderPage() {
  useAuthStore.setState({ status: "signed-in", user: { email: "o@example.com", first_name: "O", is_staff: true }, csrf: "t" });
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <PromoCodes />
    </QueryClientProvider>,
  );
}

describe("PromoCodes", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("shows each code with redemptions, discount given and remaining uses", async () => {
    api([code(), code({ id: "p2", code: "FLAT5K", discount_type: "flat", discount_value: 500000, min_order_value: null, max_uses: null, remaining_uses: null, is_active: false })]);
    renderPage();
    const naps = (await screen.findByRole("heading", { name: "NAPS20" })).closest("li")!;
    expect(within(naps).getByText("Active")).toBeInTheDocument();
    expect(within(naps).getByText("20% off on orders of ₦10,000 or more")).toBeInTheDocument();
    expect(within(naps).getByText("Redemptions").nextSibling).toHaveTextContent("2");
    expect(within(naps).getByText("Discount given").nextSibling).toHaveTextContent("₦3,500");
    expect(within(naps).getByText("Remaining").nextSibling).toHaveTextContent("98");
    const flat = screen.getByRole("heading", { name: "FLAT5K" }).closest("li")!;
    expect(within(flat).getByText("Inactive")).toBeInTheDocument();
    expect(within(flat).getByText("₦5,000 off")).toBeInTheDocument();
    expect(within(flat).getByText("Remaining").nextSibling).toHaveTextContent("Unlimited");
  });

  it("creates a flat code, entering naira and sending kobo", async () => {
    const fetchMock = api([]);
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Create a code" }));
    await userEvent.type(screen.getByLabelText("Code"), "welcome");
    await userEvent.selectOptions(screen.getByLabelText("Discount type"), "flat");
    await userEvent.type(screen.getByLabelText("Discount (₦)"), "2500");
    await userEvent.type(screen.getByLabelText("Minimum order (₦, optional)"), "15000");
    await userEvent.type(screen.getByLabelText("Total uses (empty for unlimited)"), "50");
    await userEvent.click(screen.getByRole("button", { name: "Create code" }));
    expect(await screen.findByText("Created WELCOME.")).toBeInTheDocument();
    expect(bodyOf(fetchMock, "POST")).toEqual({
      code: "welcome",
      discount_type: "flat",
      discount_value: 250000,
      min_order_value: 1500000,
      max_uses: 50,
      max_uses_per_user: 1,
      expires_at: null,
    });
  });

  it("edits, deactivates and refuses to delete a used code", async () => {
    const fetchMock = api([code()], 409);
    renderPage();
    const row = (await screen.findByRole("heading", { name: "NAPS20" })).closest("li")!;
    await userEvent.click(within(row).getByRole("button", { name: "Edit NAPS20" }));
    const value = within(row).getByLabelText("Discount (%)");
    await userEvent.clear(value);
    await userEvent.type(value, "25");
    await userEvent.click(within(row).getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Saved NAPS20.")).toBeInTheDocument();
    expect(bodyOf(fetchMock, "PATCH")).toMatchObject({ discount_value: 25, min_order_value: 1000000 });
    await userEvent.click(within(row).getByRole("button", { name: "Deactivate NAPS20" }));
    expect(await screen.findByText("NAPS20 is now inactive.")).toBeInTheDocument();
    expect(bodyOf(fetchMock, "PATCH")).toEqual({ is_active: false });
    await userEvent.click(within(row).getByRole("button", { name: "Delete NAPS20" }));
    await userEvent.click(within(row).getByRole("button", { name: "Confirm delete" }));
    expect(await within(row).findByRole("alert")).toHaveTextContent("Deactivate it instead");
  });

  it("deletes an unused code", async () => {
    api([code({ redemptions: 0, uses_count: 0 })]);
    renderPage();
    const row = (await screen.findByRole("heading", { name: "NAPS20" })).closest("li")!;
    await userEvent.click(within(row).getByRole("button", { name: "Delete NAPS20" }));
    await userEvent.click(within(row).getByRole("button", { name: "Confirm delete" }));
    expect(await screen.findByText("Deleted NAPS20.")).toBeInTheDocument();
    expect(await screen.findByText("No promo codes yet.")).toBeInTheDocument();
  });
});
