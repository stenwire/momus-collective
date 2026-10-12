import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { order } from "@/test/order";
import TrackOrderPage, { metadata } from "./page";

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

function respond(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function renderPage(token: string) {
  const page = await TrackOrderPage({ params: Promise.resolve({ token }) });
  return render(<QueryClientProvider client={new QueryClient()}>{page}</QueryClientProvider>);
}

describe("TrackOrderPage", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("shows the order's progress, estimate and items, fetched fresh by token", async () => {
    const fetchMock = respond(200, { ...order, status: "printed", status_label: "Printed", pipeline_step: 2 });
    await renderPage("tok/en");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/orders/track/tok%2Fen/"),
      { cache: "no-store" },
    );
    expect(screen.getByRole("heading", { name: "Order MOM-20261011-001" })).toBeInTheDocument();
    const progress = screen.getByRole("list", { name: "Order progress" });
    expect(within(progress).getByText("Printed")).toHaveAttribute("aria-current", "step");
    expect(screen.getByText("Mon, 12 Oct – Wed, 14 Oct")).toBeInTheDocument();
    expect(screen.getByText("war bad naps good")).toBeInTheDocument();
    expect(screen.getByText("Free")).toBeInTheDocument();
    expect(screen.getByText("−₦2,400")).toBeInTheDocument();
  });

  it("calls a design under review part of Paid", async () => {
    respond(200, { ...order, status: "moderation", status_label: "Moderation", pipeline_step: 0 });
    await renderPage("tok");
    expect(screen.getByText("Paid")).toHaveAttribute("aria-current", "step");
    expect(screen.getByText(/your design is being reviewed/)).toBeInTheDocument();
  });

  it("renders the server's steps and says when an order was cancelled", async () => {
    respond(200, { ...order, status: "cancelled", status_label: "Cancelled", pipeline_step: null });
    await renderPage("tok");
    expect(screen.queryByRole("list", { name: "Order progress" })).not.toBeInTheDocument();
    expect(screen.getByText("This order was cancelled.")).toBeInTheDocument();
  });

  it("labels steps as the server names them", async () => {
    respond(200, { ...order, status: "out_for_delivery", status_label: "Out for Delivery", pipeline_step: 3 });
    await renderPage("tok");
    expect(screen.getByText("Out for Delivery")).toHaveAttribute("aria-current", "step");
    expect(screen.getByText("Shirt Acquired")).not.toHaveAttribute("aria-current");
  });

  it("shows Paystack's fee and the total paid when the customer bore it", async () => {
    respond(200, { ...order, payment_fee: 52031, amount_paid: 2212031 });
    await renderPage("tok");
    expect(screen.getByText("Paystack fee").nextSibling).toHaveTextContent("₦520.31");
    expect(screen.getByText("Total paid").nextSibling).toHaveTextContent("₦22,120.31");
  });

  it("shows no fee lines when there was no fee", async () => {
    respond(200, order);
    await renderPage("tok");
    expect(screen.queryByText("Paystack fee")).not.toBeInTheDocument();
  });

  it("is a 404 for a token that matches no order", async () => {
    respond(404, {});
    await expect(TrackOrderPage({ params: Promise.resolve({ token: "MOM-20261011-001" }) })).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });

  it("keeps the token out of search engines and referrers", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.referrer).toBe("no-referrer");
  });
});
