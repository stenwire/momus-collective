import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RouteError from "@/app/error";
import { existsSync } from "node:fs";
import { join } from "node:path";
import Loading from "@/app/design/loading";
import NotFound from "@/app/not-found";
import { signedOut } from "@/test/auth";
import { SiteFooter } from "./site-footer";
import { SiteNav } from "./site-nav";

let pathname = "/shop";
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

function withQuery(ui: ReactNode) {
  return <QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>;
}

describe("SiteNav", () => {
  beforeEach(() => {
    pathname = "/shop";
    signedOut();
  });

  it("marks the current section and keeps the wordmark as a named home link", () => {
    render(withQuery(<SiteNav />));
    const main = screen.getByRole("navigation", { name: "Main" });
    expect(within(main).getByRole("link", { name: "Shop" })).toHaveAttribute("aria-current", "page");
    expect(within(main).getByRole("link", { name: "Design" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "momus collective, home" })).toHaveAttribute("href", "/");
  });

  it("opens a full-screen menu and closes it when a link is chosen", async () => {
    const user = userEvent.setup();
    render(withQuery(<SiteNav />));
    const menuButton = screen.getByRole("button", { name: "Menu" });
    expect(menuButton).toHaveAttribute("aria-expanded", "false");

    await user.click(menuButton);
    const menu = screen.getByRole("dialog", { name: "Menu" });
    expect(within(menu).getByRole("link", { name: "Design" })).toBeInTheDocument();
    expect(within(menu).getByRole("button", { name: "Close menu" })).toHaveFocus();

    await user.click(within(menu).getByRole("link", { name: "Design" }));
    expect(screen.queryByRole("dialog", { name: "Menu" })).not.toBeInTheDocument();
  });
});

describe("SiteFooter", () => {
  it("carries the tagline and the newsletter", () => {
    render(<SiteFooter />);
    expect(screen.getByText(/dressed up,/)).toHaveTextContent("dressed up,filtered out.");
    expect(screen.getByLabelText("Get new drops by email")).toBeInTheDocument();
  });
});

describe("route states", () => {
  it("404 shows the raven and a way back", () => {
    render(<NotFound />);
    expect(screen.getByRole("heading", { level: 1, name: "Exiled from Olympus." })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /raven/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to the shop" })).toHaveAttribute("href", "/shop");
  });

  it("error offers a retry that calls reset", async () => {
    const reset = vi.fn();
    render(<RouteError error={new Error("boom")} reset={reset} />);
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledOnce();
    expect(screen.getByRole("img", { name: /raven/i })).toBeInTheDocument();
  });

  it("has no root loading boundary, which would turn every 404 into a 200", () => {
    expect(existsSync(join(process.cwd(), "src/app/loading.tsx"))).toBe(false);
  });

  it("the design page's loading state announces itself without spinner flashes", () => {
    render(<Loading />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
    expect(screen.getByRole("main")).toHaveAttribute("aria-busy", "true");
  });
});
