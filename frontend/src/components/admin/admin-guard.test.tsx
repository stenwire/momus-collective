import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/lib/auth/store";
import { signedOut } from "@/test/auth";
import { AdminGuard } from "./admin-guard";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/admin/orders",
}));

describe("AdminGuard", () => {
  beforeEach(() => replace.mockClear());

  it("sends a signed-out visitor to log in and back", () => {
    signedOut();
    render(<AdminGuard>secret board</AdminGuard>);
    expect(replace).toHaveBeenCalledWith("/login?next=%2Fadmin%2Forders");
    expect(screen.queryByText("secret board")).not.toBeInTheDocument();
  });

  it("tells a signed-in customer the area is staff only", () => {
    useAuthStore.setState({ status: "signed-in", user: { email: "a@example.com", first_name: "A", is_staff: false } });
    render(<AdminGuard>secret board</AdminGuard>);
    expect(screen.getByRole("alert")).toHaveTextContent("staff only");
    expect(screen.queryByText("secret board")).not.toBeInTheDocument();
  });

  it("shows staff the panel", () => {
    useAuthStore.setState({ status: "signed-in", user: { email: "o@example.com", first_name: "O", is_staff: true } });
    render(<AdminGuard>secret board</AdminGuard>);
    expect(screen.getByText("secret board")).toBeInTheDocument();
  });
});
