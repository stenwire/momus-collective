import { type Tokens, useAuthStore } from "./store";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: Record<string, unknown>,
  ) {
    super(`Request failed: ${status}`);
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

export async function login(email: string, password: string, rememberMe: boolean) {
  const tokens = await post<Tokens>("/api/v1/auth/login/", {
    email,
    password,
    remember_me: rememberMe,
  });
  useAuthStore.getState().signIn(tokens, email);
}

export type Registration = {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone: string;
};

export async function register(details: Registration) {
  await post("/api/v1/auth/register/", details);
  await login(details.email, details.password, true);
}

// Refresh tokens rotate and are blacklisted after use, so concurrent 401s
// must share one refresh rather than race to spend the same token.
let refreshing: Promise<boolean> | null = null;

function refreshTokens(): Promise<boolean> {
  const { tokens, setTokens, signOut } = useAuthStore.getState();
  if (!tokens) return Promise.resolve(false);
  refreshing ??= post<Tokens>("/api/v1/auth/token/refresh/", {
    refresh: tokens.refresh,
  })
    .then((next) => {
      setTokens(next);
      return true;
    })
    .catch(() => {
      signOut();
      return false;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

export async function authFetch(path: string, init: RequestInit = {}) {
  const send = () => {
    const access = useAuthStore.getState().tokens?.access;
    const headers = new Headers(init.headers);
    if (access) headers.set("Authorization", `Bearer ${access}`);
    if (init.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    return fetch(`${API_URL}${path}`, { ...init, headers });
  };
  const res = await send();
  if (res.status !== 401 || !useAuthStore.getState().tokens) return res;
  return (await refreshTokens()) ? send() : res;
}

// Only same-site paths: "//evil.com", "/\\evil.com" (browsers read the
// backslash as a slash) and absolute URLs are open redirects.
export function safeNext(next: string | null, fallback = "/"): string {
  return next && /^\/(?![/\\])/.test(next) ? next : fallback;
}

export function errorMessages(error: unknown): string[] {
  if (!(error instanceof ApiError)) return ["Something went wrong. Try again."];
  if (error.status === 429) return ["Too many attempts. Wait a minute and retry."];
  const messages = Object.values(error.body).flatMap((value) =>
    Array.isArray(value) ? value.map(String) : [String(value)],
  );
  return messages.length ? messages : ["Something went wrong. Try again."];
}
