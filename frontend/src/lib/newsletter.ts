const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// Sent without the session cookie: the list is the same for everyone.
async function post(path: string, body: unknown): Promise<string> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 429) throw new Error("Too many tries. Wait a minute and try again.");
  if (!res.ok) {
    const first = Object.values(data)[0];
    throw new Error(Array.isArray(first) ? String(first[0]) : String(first ?? "Something went wrong."));
  }
  return String(data.detail ?? "");
}

export const subscribeToNewsletter = (email: string) => post("/api/v1/newsletter/subscribe/", { email });

export const unsubscribeFromNewsletter = (token: string) => post("/api/v1/newsletter/unsubscribe/", { token });
