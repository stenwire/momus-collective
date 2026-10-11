import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { order } from "@/test/order";
import TrackOrderPage, { metadata } from "./page";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
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
  const page = await TrackOrderPage({ params: Promise.resolve({ token }), searchParams: Promise.resolve({}) });
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

  it("offers a rejected design's revision or a refund", async () => {
    const designItem = { ...order.items[0], id: "d1", kind: "design" as const, slogan_text: "MY TEXT" };
    const fetchMock = respond(200, {
      ...order,
      status: "moderation",
      status_label: "Moderation",
      items: [designItem],
      design_review: { reason_label: "Unprintable design", details: "The text is too small.", customer_choice: "" },
    });
    await renderPage("tok");
    const panel = screen.getByRole("region", { name: "We can't print your design as it is" });
    expect(within(panel).getByText("Unprintable design")).toBeInTheDocument();
    expect(within(panel).getByText("The text is too small.")).toBeInTheDocument();
    expect(within(panel).getByRole("link", { name: "Revise my design" })).toHaveAttribute("href", "/track/tok/revise/d1");
    fetchMock.mockResolvedValue({ ok: true, status: 204, json: async () => ({}) });
    await userEvent.click(within(panel).getByRole("button", { name: "Request a refund" }));
    expect(fetchMock).toHaveBeenLastCalledWith(
      expect.stringContaining("/api/v1/orders/track/tok/refund-request/"),
      expect.objectContaining({ method: "POST" }),
    );
    expect(refresh).toHaveBeenCalled();
  });

  it("confirms a refund request instead of offering choices", async () => {
    respond(200, {
      ...order,
      status: "moderation",
      design_review: { reason_label: "Offensive content", details: "", customer_choice: "refund" },
    });
    await renderPage("tok");
    expect(screen.getByText(/You asked for a refund/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Request a refund" })).not.toBeInTheDocument();
  });

  it("thanks the customer after a revision", async () => {
    respond(200, order);
    const page = await TrackOrderPage({ params: Promise.resolve({ token: "tok" }), searchParams: Promise.resolve({ revised: "1" }) });
    render(<QueryClientProvider client={new QueryClient()}>{page}</QueryClientProvider>);
    expect(screen.getByText(/we've got your revised design/)).toBeInTheDocument();
  });

  it("is a 404 for a token that matches no order", async () => {
    respond(404, {});
    await expect(TrackOrderPage({ params: Promise.resolve({ token: "MOM-20261011-001" }), searchParams: Promise.resolve({}) })).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });

  it("keeps the token out of search engines and referrers", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.referrer).toBe("no-referrer");
  });
});
