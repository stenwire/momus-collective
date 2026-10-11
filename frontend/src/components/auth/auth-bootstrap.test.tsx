import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/lib/auth/store";
import { testUser } from "@/test/auth";
import { AuthBootstrap } from "./auth-bootstrap";

describe("AuthBootstrap", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("wipes tokens the pre-cookie build stored and loads the session", async () => {
    localStorage.setItem("momus-auth", JSON.stringify({ state: { tokens: { access: "old" } } }));
    useAuthStore.setState({ status: "unknown", user: null, csrf: null });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ user: testUser, csrf: "c" }) }),
    );
    render(<AuthBootstrap />);
    expect(localStorage.getItem("momus-auth")).toBeNull();
    await vi.waitFor(() => expect(useAuthStore.getState().status).toBe("signed-in"));
  });

  it("settles on signed out when the API is unreachable", async () => {
    useAuthStore.setState({ status: "unknown", user: null, csrf: null });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    render(<AuthBootstrap />);
    await vi.waitFor(() => expect(useAuthStore.getState().status).toBe("signed-out"));
  });
});
