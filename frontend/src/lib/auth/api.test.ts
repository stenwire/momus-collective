import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, authFetch, errorMessages, login, safeNext } from "./api";
import { useAuthStore } from "./store";

const json = (status: number, body: unknown) =>
  ({ ok: status < 400, status, json: async () => body }) as Response;

describe("auth api", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    useAuthStore.setState({ tokens: null, email: null });
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("login stores the token pair and sends remember_me", async () => {
    fetchMock.mockResolvedValue(json(200, { access: "a1", refresh: "r1" }));
    await login("me@example.com", "pw", true);
    expect(useAuthStore.getState()).toMatchObject({
      tokens: { access: "a1", refresh: "r1" },
      email: "me@example.com",
    });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      email: "me@example.com",
      password: "pw",
      remember_me: true,
    });
  });

  it("login rejects with the API's error body", async () => {
    fetchMock.mockResolvedValue(json(401, { detail: "No active account" }));
    await expect(login("me@example.com", "bad", false)).rejects.toBeInstanceOf(ApiError);
    expect(useAuthStore.getState().tokens).toBeNull();
  });

  it("authFetch sends the access token", async () => {
    useAuthStore.setState({ tokens: { access: "a1", refresh: "r1" } });
    fetchMock.mockResolvedValue(json(200, {}));
    await authFetch("/api/v1/designs/");
    const headers = fetchMock.mock.calls[0][1].headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer a1");
  });

  it("refreshes once on a 401 and retries with the rotated token", async () => {
    useAuthStore.setState({ tokens: { access: "old", refresh: "r1" } });
    fetchMock
      .mockResolvedValueOnce(json(401, {}))
      .mockResolvedValueOnce(json(200, { access: "new", refresh: "r2" }))
      .mockResolvedValueOnce(json(200, { ok: true }));
    const res = await authFetch("/api/v1/designs/");
    expect(res.status).toBe(200);
    expect(useAuthStore.getState().tokens).toEqual({ access: "new", refresh: "r2" });
    expect((fetchMock.mock.calls[2][1].headers as Headers).get("Authorization")).toBe(
      "Bearer new",
    );
  });

  it("concurrent 401s share a single refresh", async () => {
    useAuthStore.setState({ tokens: { access: "old", refresh: "r1" } });
    fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
      if (url.endsWith("/token/refresh/")) return json(200, { access: "new", refresh: "r2" });
      const auth = (init.headers as Headers).get("Authorization");
      return json(auth === "Bearer new" ? 200 : 401, {});
    });
    await Promise.all([authFetch("/a/"), authFetch("/b/"), authFetch("/c/")]);
    const refreshes = fetchMock.mock.calls.filter(([url]) => url.endsWith("/token/refresh/"));
    expect(refreshes).toHaveLength(1);
  });

  it("signs out when the refresh token is rejected", async () => {
    useAuthStore.setState({ tokens: { access: "old", refresh: "dead" }, email: "x" });
    fetchMock.mockResolvedValueOnce(json(401, {})).mockResolvedValueOnce(json(401, {}));
    const res = await authFetch("/api/v1/designs/");
    expect(res.status).toBe(401);
    expect(useAuthStore.getState().tokens).toBeNull();
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

  it("explains throttling", () => {
    expect(errorMessages(new ApiError(429, {}))[0]).toMatch(/Too many attempts/);
  });
});
