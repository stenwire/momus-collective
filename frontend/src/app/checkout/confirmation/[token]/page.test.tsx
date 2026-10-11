import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signedIn, signedOut } from "@/test/auth";
import { order } from "@/test/order";
import ConfirmationPage, { metadata } from "./page";

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const guest = { email: "g@example.com", first_name: "Ada", last_name: "Lovelace", phone: "+2348000000000" };

function respond(status: number, body: unknown) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body }));
}

async function renderPage() {
  const page = await ConfirmationPage({ params: Promise.resolve({ token: "tok" }) });
  return render(<QueryClientProvider client={new QueryClient()}>{page}</QueryClientProvider>);
}

describe("ConfirmationPage", () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("shows the order number, summary, estimated delivery and tracking link", async () => {
    signedIn();
    respond(200, order);
    await renderPage();
    expect(screen.getByRole("heading", { name: /your order is confirmed/ })).toBeInTheDocument();
    expect(screen.getByText("MOM-20261011-001")).toBeInTheDocument();
    expect(screen.getByText("Mon, 12 Oct – Wed, 14 Oct")).toBeInTheDocument();
    expect(screen.getByText("war bad naps good")).toBeInTheDocument();
    expect(screen.getByText("₦21,600")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Track your order" })).toHaveAttribute("href", "/track/tok");
    expect(screen.queryByRole("link", { name: "Create my account" })).not.toBeInTheDocument();
  });

  it("offers a guest an account with their checkout details filled in", async () => {
    signedOut();
    sessionStorage.setItem("momus-guest-details", JSON.stringify(guest));
    respond(200, order);
    await renderPage();
    const href = (await screen.findByRole("link", { name: "Create my account" })).getAttribute("href")!;
    expect(Object.fromEntries(new URL(href, "http://x").searchParams)).toMatchObject(guest);
  });

  it("makes no offer to a signed-in customer", async () => {
    signedIn();
    sessionStorage.setItem("momus-guest-details", JSON.stringify(guest));
    respond(200, order);
    await renderPage();
    expect(screen.queryByRole("link", { name: "Create my account" })).not.toBeInTheDocument();
  });

  it("is a 404 for an unknown token", async () => {
    respond(404, {});
    await expect(ConfirmationPage({ params: Promise.resolve({ token: "MOM-20261011-001" }) })).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });

  it("stays out of search engines and referrers", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.referrer).toBe("no-referrer");
  });
});
