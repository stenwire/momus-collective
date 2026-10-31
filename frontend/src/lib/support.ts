import { ApiError, authFetch } from "@/lib/auth/api";

export type ComplaintTopic = "order" | "delivery" | "quality" | "payment" | "privacy" | "other";

export async function submitComplaint(body: {
  email: string;
  order_number: string;
  topic: ComplaintTopic;
  details: string;
  website: string;
}): Promise<{ reference: string }> {
  const response = await authFetch("/api/v1/support/complaints/", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(response.status, data);
  return data as { reference: string };
}