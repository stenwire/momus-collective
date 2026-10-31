import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/lib/auth/store";
import { signedIn, signedOut } from "@/test/auth";
import { AuthNav } from "./auth-nav";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

describe("AuthNav", () => {
  beforeEach(() => useAuthStore.setState({ status: "unknown", user: null, csrf: null }));

  it("shows the admin link only to staff", () => {
    signedIn();
    const { rerender } = render(<AuthNav />);
    expect(screen.queryByRole("link", { name: "Admin" })).not.toBeInTheDocument();

    useAuthStore.setState({ user: { email: "admin@example.com", first_name: "Admin", is_staff: true } });
    rerender(<AuthNav />);

    expect(screen.getByRole("link", { name: "Admin" })).toHaveAttribute("href", "/admin");
    expect(screen.getByRole("link", { name: "Account" })).toHaveAttribute("href", "/account/orders");
  });

  it("does not show account or admin links when signed out", () => {
    signedOut();
    render(<AuthNav />);
    expect(screen.getByRole("link", { name: "Log in" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Admin" })).not.toBeInTheDocument();
  });
});