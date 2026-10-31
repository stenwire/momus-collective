import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signedIn } from "@/test/auth";
import { AdminComplaints } from "./complaints";

const complaint = {
  id: "c1",
  email: "customer@example.com",
  order_number: "MOM-123",
  topic: "delivery",
  topic_label: "Delivery",
  details: "My order has not arrived.",
  status: "open" as const,
  status_label: "Open",
  created_at: "2026-10-18T10:00:00Z",
  updated_at: "2026-10-18T10:00:00Z",
};
const json = (status: number, body: unknown) =>
  ({ ok: status < 400, status, json: async () => body }) as Response;

function renderQueue() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <AdminComplaints />
    </QueryClientProvider>,
  );
}

describe("AdminComplaints", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let status: "open" | "resolved";

  beforeEach(() => {
    signedIn();
    status = "open";
    fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        status = JSON.parse(String(init.body)).status;
        return json(200, { ...complaint, status, status_label: status === "open" ? "Open" : "Resolved" });
      }
      const results = [{ ...complaint, status, status_label: status === "open" ? "Open" : "Resolved" }];
      return json(200, { count: 1, next: null, results });
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("shows a complaint and lets staff resolve it", async () => {
    renderQueue();
    expect(await screen.findByText("My order has not arrived.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Mark resolved" }));

    expect(await screen.findByText("Resolved")).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "PATCH")).toBe(true);
  });
});
