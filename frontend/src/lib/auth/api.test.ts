import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signedIn, signedOut, testUser } from "@/test/auth";
import {
  ApiError,
  authFetch,
  errorMessages,
  loadSession,
  login,
  logout,
  safeNext,
} from "./api";
import { useAuthStore } from "./store";

const json = (status: number, body: unknown) =>
  ({ ok: status < 400, status, json: async () => body }) as Response;
const headersOf = (call: unknown[]) => (call[1] as RequestInit).headers as Headers;

describe("cookie session api", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    useAuthStore.setState({ status: "unknown", user: null, csrf: null });
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("loadSession reads the user and CSRF token, credentials included", async () => {
    fetchMock.mockResolvedValue(json(200, { user: testUser, csrf: "c1" }));
    await loadSession();
    expect(useAuthStore.getState()).toMatchObject({
      status: "signed-in",
      user: testUser,
      csrf: "c1",
    });
    expect(fetchMock.mock.calls[0][1].credentials).toBe("include");
  });

  it("login fetches a CSRF token first, sends it, and stores no token", async () => {
    fetchMock
      .mockResolvedValueOnce(json(200, { user: null, csrf: "c1" }))
      .mockResolvedValueOnce(json(200, { user: testUser, csrf: "c2" }));
    await login("ada@example.com", "pw", true);
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toMatch(/\/auth\/session\/login\/$/);
    expect(headersOf(fetchMock.mock.calls[1]).get("X-CSRFToken")).toBe("c1");
    expect(JSON.parse(init.body)).toEqual({
      email: "ada@example.com",
      password: "pw",
      remember_me: true,
    });
    expect(useAuthStore.getState()).toMatchObject({ status: "signed-in", csrf: "c2" });
    expect(JSON.stringify(useAuthStore.getState())).not.toMatch(/access|refresh/);
  });

  it("nothing auth-related is written to localStorage", async () => {
    localStorage.clear();
    fetchMock
      .mockResolvedValueOnce(json(200, { user: null, csrf: "c1" }))
      .mockResolvedValueOnce(json(200, { user: testUser, csrf: "c2" }));
    await login("ada@example.com", "pw", true);
    expect(Object.keys(localStorage)).toEqual([]);
  });

  it("login rejects with the API's error and stays signed out", async () => {
    signedOut();
    fetchMock.mockResolvedValue(json(401, { detail: "No active account" }));
    await expect(login("ada@example.com", "bad", false)).rejects.toBeInstanceOf(ApiError);
    expect(useAuthStore.getState().status).toBe("signed-out");
  });

  it("authFetch sends cookies and the CSRF header on writes only", async () => {
    signedIn();
    fetchMock.mockResolvedValue(json(200, {}));
    await authFetch("/api/v1/designs/");
    await authFetch("/api/v1/designs/", { method: "POST", body: "{}" });
    expect(headersOf(fetchMock.mock.calls[0]).has("X-CSRFToken")).toBe(false);
    expect(headersOf(fetchMock.mock.calls[1]).get("X-CSRFToken")).toBe("csrf-token");
    expect(fetchMock.mock.calls.every(([, i]) => i.credentials === "include")).toBe(true);
    expect(headersOf(fetchMock.mock.calls[0]).has("Authorization")).toBe(false);
  });

  it("refreshes the session once on a 401 and retries", async () => {
    signedIn();
    fetchMock
      .mockResolvedValueOnce(json(401, {}))
      .mockResolvedValueOnce(json(200, { user: testUser, csrf: "c2" }))
      .mockResolvedValueOnce(json(200, { ok: true }));
    const res = await authFetch("/api/v1/designs/");
    expect(res.status).toBe(200);
    expect(fetchMock.mock.calls[1][0]).toMatch(/\/auth\/session\/refresh\/$/);
    expect(useAuthStore.getState().csrf).toBe("c2");
  });

  it("concurrent 401s share a single refresh", async () => {
    signedIn();
    let refreshed = false;
    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith("/session/refresh/")) {
        refreshed = true;
        return json(200, { user: testUser, csrf: "c2" });
      }
      return json(refreshed ? 200 : 401, {});
    });
    await Promise.all([authFetch("/a/"), authFetch("/b/"), authFetch("/c/")]);
    const refreshes = fetchMock.mock.calls.filter(([url]) => url.endsWith("/session/refresh/"));
    expect(refreshes).toHaveLength(1);
  });

  it("signs out when the refresh is refused", async () => {
    signedIn();
    fetchMock.mockResolvedValueOnce(json(401, {})).mockResolvedValueOnce(json(401, {}));
    const res = await authFetch("/api/v1/designs/");
    expect(res.status).toBe(401);
    expect(useAuthStore.getState().status).toBe("signed-out");
  });

  it("logout posts with the CSRF token and signs out", async () => {
    signedIn();
    fetchMock.mockResolvedValue(json(204, {}));
    await logout();
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/auth\/session\/logout\/$/);
    expect(headersOf(fetchMock.mock.calls[0]).get("X-CSRFToken")).toBe("csrf-token");
    expect(useAuthStore.getState().status).toBe("signed-out");
  });
});

describe("safeNext", () => {
  it.each([
    ["/design", "/design"],
    ["/account/designs?x=1", "/account/designs?x=1"],
    ["//evil.com", "/"],
    ["/\\evil.com", "/"],
    ["https://evil.com", "/"],
    [null, "/"],
  ])("%s -> %s", (input, expected) => {
    expect(safeNext(input)).toBe(expected);
  });
});

describe("errorMessages", () => {
  it("flattens DRF field errors", () => {
    const error = new ApiError(400, {
      email: ["An account with this email address already exists."],
      password: ["This password is too short."],
    });
    expect(errorMessages(error)).toEqual([
      "An account with this email address already exists.",
      "This password is too short.",
    ]);
  });

  it("flattens nested errors such as a design config's", () => {
    const error = new ApiError(400, { config: { text: ["Too long."], font: "Nope." } });
    expect(errorMessages(error)).toEqual(["Too long.", "Nope."]);
  });

  it("explains throttling", () => {
    expect(errorMessages(new ApiError(429, {}))[0]).toMatch(/Too many attempts/);
  });
});
