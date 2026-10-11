import { type SessionUser, useAuthStore } from "./store";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: Record<string, unknown>,
  ) {
    super(`Request failed: ${status}`);
  }
}

type SessionBody = { user: SessionUser | null; csrf: string; retry?: boolean };

// Credentialed so the httpOnly auth cookies ride along; every write carries
// the CSRF token the session endpoint handed us.
function request(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const method = (init.method ?? "GET").toUpperCase();
  const csrf = useAuthStore.getState().csrf;
  if (!SAFE_METHODS.has(method) && csrf) headers.set("X-CSRFToken", csrf);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`${API_URL}${path}`, { ...init, headers, credentials: "include" });
}

async function parse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

function applySession(body: SessionBody) {
  useAuthStore.getState().setSession(body.user, body.csrf);
}

export async function loadSession(): Promise<void> {
  const read = async () =>
    parse<SessionBody>(await request("/api/v1/auth/session/"));
  let body = await read();
  // Another tab rotated the refresh token first; its cookies are ours now.
  if (body.retry) body = await read();
  applySession(body);
}

async function ensureCsrf() {
  if (!useAuthStore.getState().csrf) await loadSession();
}

export async function login(email: string, password: string, rememberMe: boolean) {
  await ensureCsrf();
  const res = await request("/api/v1/auth/session/login/", {
    method: "POST",
    body: JSON.stringify({ email, password, remember_me: rememberMe }),
  });
  applySession(await parse<SessionBody>(res));
}

export type Registration = {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone: string;
};

export async function register(details: Registration) {
  await ensureCsrf();
  await parse(
    await request("/api/v1/auth/register/", {
      method: "POST",
      body: JSON.stringify(details),
    }),
  );
  await login(details.email, details.password, true);
}

export async function logout() {
  await ensureCsrf();
  await request("/api/v1/auth/session/logout/", { method: "POST" });
  useAuthStore.getState().signOut();
}

// Refresh tokens rotate and are blacklisted after use, so concurrent 401s
// must share one refresh rather than race to spend the same token.
let refreshing: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  refreshing ??= request("/api/v1/auth/session/refresh/", { method: "POST" })
    .then(async (res) => {
      if (!res.ok) throw new Error("refresh failed");
      applySession(await res.json());
      return true;
    })
    // Refused: possibly because another tab already rotated the token and
    // set fresh cookies. Ask the session before deciding we're signed out.
    .catch(async () => {
      await loadSession().catch(() => useAuthStore.getState().signOut());
      return useAuthStore.getState().status === "signed-in";
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

export async function authFetch(path: string, init: RequestInit = {}) {
  const res = await request(path, init);
  if (res.status !== 401 || useAuthStore.getState().status !== "signed-in") {
    return res;
  }
  return (await refreshSession()) ? request(path, init) : res;
}

// Only same-site paths: "//evil.com", "/\\evil.com" (browsers read the
// backslash as a slash) and absolute URLs are open redirects.
export function safeNext(next: string | null, fallback = "/"): string {
  return next && /^\/(?![/\\])/.test(next) ? next : fallback;
}

export function errorMessages(error: unknown): string[] {
  if (!(error instanceof ApiError)) return ["Something went wrong. Try again."];
  if (error.status === 429) return ["Too many attempts. Wait a minute and retry."];
  const messages = flatten(error.body);
  return messages.length ? messages : ["Something went wrong. Try again."];
}

// DRF nests errors per field, e.g. {config: {text_color: ["..."]}}.
function flatten(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(flatten);
  if (value && typeof value === "object") return Object.values(value).flatMap(flatten);
  return value == null || value === "" ? [] : [String(value)];
}
