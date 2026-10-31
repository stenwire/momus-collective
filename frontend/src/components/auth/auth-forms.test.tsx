import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/lib/auth/store";
import { useDesignStore } from "@/lib/design/store";
import { signedIn, signedOut, testUser } from "@/test/auth";
import { designOptions } from "@/test/design-fixtures";
import { AuthNav } from "./auth-nav";
import { LogoutButton } from "./logout-button";
import { LoginForm } from "./login-form";
import { RegisterForm } from "./register-form";

const push = vi.fn();
let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(search),
  usePathname: () => "/",
}));

const json = (status: number, body: unknown) =>
  ({ ok: status < 400, status, json: async () => body }) as Response;

describe("auth forms", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    push.mockReset();
    search = "";
    signedOut();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("logs in and returns to the requested page", async () => {
    search = "next=/design";
    fetchMock.mockResolvedValue(json(200, { user: testUser, csrf: "c2" }));
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText("Email"), "me@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "correct-horse");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect(useAuthStore.getState().status).toBe("signed-in");
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
    fetchMock.mockResolvedValue(json(200, { user: testUser, csrf: "c2" }));
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
      .mockResolvedValueOnce(json(200, { user: testUser, csrf: "c2" }));
    render(<RegisterForm />);
    await userEvent.type(screen.getByLabelText("First name"), "Ada");
    await userEvent.type(screen.getByLabelText("Email"), "new@example.com");
    await userEvent.type(screen.getByLabelText("Phone"), "8000000000");
    await userEvent.type(screen.getByLabelText("Password"), "correct-horse");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      email: "new@example.com",
      first_name: "Ada",
      phone: "+2348000000000",
    });
    expect(useAuthStore.getState().status).toBe("signed-in");
    expect(push).toHaveBeenCalledWith("/design");
  });

  it("pre-fills from a guest checkout's account offer", () => {
    search = "email=g%40example.com&first_name=Ada&last_name=L&phone=%2B2348000000000";
    render(<RegisterForm />);
    expect(screen.getByLabelText("Email")).toHaveValue("g@example.com");
    expect(screen.getByLabelText("First name")).toHaveValue("Ada");
    expect(screen.getByLabelText("Last name")).toHaveValue("L");
    expect(screen.getByLabelText("Phone")).toHaveValue("8000000000");
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
    signedOut();
    render(<AuthNav />);
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
  });

  it("links to the account's orders when signed in", () => {
    signedIn();
    render(<AuthNav />);
    expect(screen.getByRole("link", { name: "Account" })).toHaveAttribute(
      "href",
      "/account/orders",
    );
  });
});

describe("LogoutButton", () => {
  it("logs out on the server and clears the whole design draft", async () => {
    signedIn();
    const fetchMock = vi.fn().mockResolvedValue(json(204, {}));
    vi.stubGlobal("fetch", fetchMock);
    const config = { ...designOptions.defaults, text: "private slogan" };
    useDesignStore.setState({ savedId: "d1", name: "mine", config, savedConfig: config });
    render(<LogoutButton />);
    await userEvent.click(screen.getByRole("button", { name: "Log out" }));
    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/"));
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/auth\/session\/logout\/$/);
    expect(useAuthStore.getState().status).toBe("signed-out");
    expect(useDesignStore.getState()).toMatchObject({
      config: null,
      savedId: null,
      savedConfig: null,
      name: "",
    });
    expect(localStorage.getItem("momus-design-draft")).not.toContain("private slogan");
    vi.unstubAllGlobals();
  });
});
