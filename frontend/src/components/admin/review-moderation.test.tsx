import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AdminReview } from "@/lib/admin/api";
import { useAuthStore } from "@/lib/auth/store";
import { ReviewModeration } from "./review-moderation";

const REASONS = [
  { key: "offensive", label: "Offensive content" },
  { key: "spam", label: "Spam" },
  { key: "irrelevant", label: "Irrelevant" },
];
const review = (extra: Partial<AdminReview> = {}): AdminReview => ({
  id: "r1",
  product: { slug: "tg", slogan: "touch grass" },
  order_number: "MOM-20261011-004",
  rating: 1,
  text: "buy crypto now",
  reviewer: "Ada L.",
  is_visible: true,
  is_flagged: false,
  hidden_reason: "",
  hidden_reason_label: "",
  created_at: "2026-10-12T10:00:00Z",
  ...extra,
});

function api(initial: AdminReview[]) {
  let list = [...initial];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === "PATCH") {
      const body = JSON.parse(String(init.body));
      list = list.map((r) =>
        url.includes(`/${r.id}/`)
          ? {
              ...r,
              ...body,
              hidden_reason_label: body.hidden_reason ? REASONS.find((x) => x.key === body.hidden_reason)!.label : r.hidden_reason_label,
            }
          : r,
      );
      return { ok: true, status: 200, json: async () => list[0] } as Response;
    }
    return { ok: true, status: 200, json: async () => ({ count: list.length, next: null, results: list, reasons: REASONS }) } as Response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderPage() {
  useAuthStore.setState({ status: "signed-in", user: { email: "o@example.com", first_name: "O", is_staff: true }, csrf: "t" });
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <ReviewModeration />
    </QueryClientProvider>,
  );
}

describe("ReviewModeration", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("flags, hides with a reason and shows a review again", async () => {
    const fetchMock = api([review()]);
    renderPage();
    const row = (await screen.findByText("buy crypto now")).closest("li")!;
    await userEvent.click(within(row).getByRole("button", { name: "Flag review by Ada L." }));
    expect(await within(row).findByText("Flagged")).toBeInTheDocument();
    await userEvent.click(within(row).getByRole("button", { name: "Hide review by Ada L." }));
    const hide = within(row).getByRole("button", { name: "Hide review" });
    expect(hide).toBeDisabled();
    await userEvent.selectOptions(within(row).getByLabelText("Guideline broken"), "spam");
    await userEvent.click(hide);
    expect(await within(row).findByText("Hidden: Spam")).toBeInTheDocument();
    const patches = fetchMock.mock.calls.filter(([, i]) => i?.method === "PATCH").map(([, i]) => JSON.parse(String(i!.body)));
    expect(patches).toEqual([{ is_flagged: true }, { is_visible: false, hidden_reason: "spam" }]);
    await userEvent.click(within(row).getByRole("button", { name: "Show review by Ada L." }));
    await waitFor(() => expect(within(row).queryByText("Hidden: Spam")).not.toBeInTheDocument());
  });

  it("filters by status", async () => {
    const fetchMock = api([review()]);
    renderPage();
    await screen.findByText("buy crypto now");
    await userEvent.click(screen.getByRole("button", { name: "Hidden" }));
    await waitFor(() => expect(new URL(fetchMock.mock.calls.at(-1)![0]).searchParams.get("show")).toBe("hidden"));
    expect(screen.getByRole("button", { name: "Hidden" })).toHaveAttribute("aria-pressed", "true");
  });
});
