import { ApiError, authFetch } from "@/lib/auth/api";

export type AccountSettings = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  notification_pref: "email" | "whatsapp" | "both";
};

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await authFetch(path, init);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(response.status, body);
  return body as T;
}

export const fetchAccountSettings = () => call<AccountSettings>("/api/v1/account/");

export const updateAccountSettings = (body: Partial<Pick<AccountSettings, "first_name" | "last_name" | "phone" | "notification_pref">>) =>
  call<AccountSettings>("/api/v1/account/", { method: "PATCH", body: JSON.stringify(body) });

export const requestEmailChange = (new_email: string) =>
  call<{ detail: string }>("/api/v1/account/email/", {
    method: "POST",
    body: JSON.stringify({ new_email }),
  });

export const changePassword = (current_password: string, new_password: string) =>
  call<{ detail: string }>("/api/v1/account/password/", {
    method: "POST",
    body: JSON.stringify({ current_password, new_password }),
  });
