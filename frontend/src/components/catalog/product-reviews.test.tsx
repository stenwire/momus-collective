import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Review } from "@/lib/reviews";
import { signedIn, signedOut } from "@/test/auth";
import { ProductReviews } from "./product-reviews";

let search = "";
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(search) }));

const review = (n: number, extra: Partial<Review> = {}): Review => ({
  id: `r${n}`,
  rating: 4,
  text: `review ${n}`,
  reviewer: "Ada L.",
  verified: true,
  created_at: "2026-10-12T10:00:00Z",
  ...extra,
});

function api({ eligible = false, pages = { "1": { count: 1, next: null, average: "4.00", results: [review(1)] } } as Record<string, unknown> } = {}) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === "POST") return { ok: true, status: 201, json: async () => review(9) } as Response;
    if (url.includes("/eligibility/"))
      return { ok: true, status: 200, json: async () => ({ can_review: eligible, reason: eligible ? "" : "Reviews open once your order with this shirt is delivered." }) } as Response;
    const page = new URL(url).searchParams.get("page") ?? "1";
    return { ok: true, status: 200, json: async () => pages[page] } as Response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderReviews() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <ProductReviews slug="tg" />
    </QueryClientProvider>,
  );
}

describe("ProductReviews", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    search = "";
  });

  it("lists reviews with stars, name, badge and the average", async () => {
    signedOut();
    api({ pages: { "1": { count: 2, next: null, average: "4.50", results: [review(1, { rating: 5 }), review(2, { text: "" })] } } });
    renderReviews();
    expect(await screen.findByText("4.5 from 2 reviews")).toBeInTheDocument();
    const items = screen.getAllByRole("listitem");
    expect(within(items[0]).getByRole("img", { name: "5 out of 5 stars" })).toBeInTheDocument();
    expect(within(items[0]).getByText("Verified Purchase")).toBeInTheDocument();
    expect(within(items[0]).getByText("Ada L.")).toBeInTheDocument();
    expect(within(items[0]).getByText("review 1")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Post review" })).not.toBeInTheDocument();
  });

  it("lets an eligible customer post a rating and review", async () => {
    signedIn();
    const fetchMock = api({ eligible: true });
    renderReviews();
    const post = await screen.findByRole("button", { name: "Post review" });
    expect(post).toBeDisabled();
    await userEvent.click(screen.getByLabelText("4 stars"));
    await userEvent.type(screen.getByLabelText("Your review (optional)"), "Soft and crisp.");
    expect(screen.getByText("15/500")).toBeInTheDocument();
    await userEvent.click(post);
    expect(await screen.findByText("Thanks for your review!")).toBeInTheDocument();
    const call = fetchMock.mock.calls.find(([, init]) => init?.method === "POST")!;
    expect(call[0]).toContain("/api/v1/products/tg/reviews/");
    expect(JSON.parse(String(call[1]!.body))).toEqual({ rating: 4, text: "Soft and crisp.", token: "" });
  });

  it("lets a guest review from the email link's token", async () => {
    signedOut();
    search = "review=tok-123";
    const fetchMock = api({ eligible: true });
    renderReviews();
    await screen.findByRole("button", { name: "Post review" });
    expect(fetchMock.mock.calls.some(([u]) => u.includes("/eligibility/?token=tok-123"))).toBe(true);
    await userEvent.click(screen.getByLabelText("5 stars"));
    await userEvent.click(screen.getByRole("button", { name: "Post review" }));
    const call = fetchMock.mock.calls.find(([, init]) => init?.method === "POST")!;
    expect(JSON.parse(String(call[1]!.body)).token).toBe("tok-123");
  });

  it("shows no form to someone who can't review yet, and says when there are none", async () => {
    signedIn();
    api({ eligible: false, pages: { "1": { count: 0, next: null, average: "0.00", results: [] } } });
    renderReviews();
    expect(await screen.findByText("No reviews yet.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Post review" })).not.toBeInTheDocument();
  });

  it("loads more reviews", async () => {
    signedOut();
    api({
      pages: {
        "1": { count: 2, next: "http://api/?page=2", average: "4.00", results: [review(1)] },
        "2": { count: 2, next: null, average: "4.00", results: [review(2)] },
      },
    });
    renderReviews();
    await userEvent.click(await screen.findByRole("button", { name: "More reviews" }));
    expect(await screen.findByText("review 2")).toBeInTheDocument();
  });
});

describe("RatingSummary", () => {
  it("shows the average and count, with a full sentence for screen readers", async () => {
    const { RatingSummary } = await import("./product-reviews");
    render(<RatingSummary average="4.50" count={2} href="#reviews" />);
    const link = screen.getByRole("link", { name: "Rated 4.5 out of 5 from 2 reviews" });
    expect(link).toHaveAttribute("href", "#reviews");
    expect(link).toHaveTextContent("4.5 (2)");
  });

  it("shows nothing for an unreviewed shirt", async () => {
    const { RatingSummary } = await import("./product-reviews");
    const { container } = render(<RatingSummary average="0.00" count={0} />);
    expect(container).toBeEmptyDOMElement();
  });
});
