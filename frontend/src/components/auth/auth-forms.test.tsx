import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/lib/auth/store";
import { AuthNav } from "./auth-nav";
import { LoginForm } from "./login-form";
import { RegisterForm } from "./register-form";

const push = vi.fn();
let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(search),
}));

const json = (status: number, body: unknown) =>
  ({ ok: status < 400, status, json: async () => body }) as Response;

describe("auth forms", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    push.mockReset();
    search = "";
    useAuthStore.setState({ tokens: null, email: null });
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("logs in and returns to the requested page", async () => {
    search = "next=/design";
    fetchMock.mockResolvedValue(json(200, { access: "a", refresh: "r" }));
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText("Email"), "me@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "correct-horse");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect(useAuthStore.getState().tokens).toEqual({ access: "a", refresh: "r" });
    expect(push).toHaveBeenCalledWith("/design");
  });

  it("shows the API's error on bad credentials", async () => {
    fetchMock.mockResolvedValue(
      json(401, { detail: "No active account found with the given credentials" }),
    );
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText("Email"), "me@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "wrong-pass");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No active account found with the given credentials",
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("refuses an off-site next parameter", async () => {
    search = "next=//evil.com";
    fetchMock.mockResolvedValue(json(200, { access: "a", refresh: "r" }));
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText("Email"), "me@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "correct-horse");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect(push).toHaveBeenCalledWith("/");
  });

  it("registers, then signs straight in", async () => {
    search = "next=/design";
    fetchMock
      .mockResolvedValueOnce(json(201, { id: "1", email: "new@example.com" }))
      .mockResolvedValueOnce(json(200, { access: "a", refresh: "r" }));
    render(<RegisterForm />);
    await userEvent.type(screen.getByLabelText("First name"), "Ada");
    await userEvent.type(screen.getByLabelText("Email"), "new@example.com");
    await userEvent.type(screen.getByLabelText("Phone"), "+2348000000000");
    await userEvent.type(screen.getByLabelText("Password"), "correct-horse");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      email: "new@example.com",
      first_name: "Ada",
      phone: "+2348000000000",
    });
    expect(useAuthStore.getState().tokens).not.toBeNull();
    expect(push).toHaveBeenCalledWith("/design");
  });

  it("shows a duplicate-email rejection", async () => {
    fetchMock.mockResolvedValueOnce(
      json(400, { email: ["An account with this email address already exists."] }),
    );
    render(<RegisterForm />);
    await userEvent.type(screen.getByLabelText("First name"), "Ada");
    await userEvent.type(screen.getByLabelText("Email"), "taken@example.com");
    await userEvent.type(screen.getByLabelText("Phone"), "+2348000000000");
    await userEvent.type(screen.getByLabelText("Password"), "correct-horse");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("already exists");
  });
});

describe("AuthNav", () => {
  it("offers Log in when signed out", () => {
    useAuthStore.setState({ tokens: null });
    render(<AuthNav />);
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
  });

  it("logs out and clears the tokens", async () => {
    useAuthStore.setState({ tokens: { access: "a", refresh: "r" }, email: "x" });
    render(<AuthNav />);
    await userEvent.click(screen.getByRole("button", { name: "Log out" }));
    expect(useAuthStore.getState().tokens).toBeNull();
  });
});
