import { ApiError, authFetch } from "@/lib/auth/api";

const SCRIPT = "https://js.paystack.co/v2/inline.js";

export type CheckoutStart = {
  reference: string;
  amount: number;
  email: string;
  public_key: string;
  channels: string[];
};

type Transaction = {
  key: string;
  email: string;
  amount: number;
  reference: string;
  channels: string[];
  onSuccess: (tx: { reference: string }) => void;
  onCancel: () => void;
  onError: (error: { message?: string }) => void;
};

type PaystackPopup = { newTransaction: (t: Transaction) => void };

declare global {
  interface Window {
    PaystackPop?: new () => PaystackPopup;
  }
}

let loading: Promise<void> | null = null;

export function loadPaystack(): Promise<void> {
  if (window.PaystackPop) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const tag = document.createElement("script");
    tag.src = SCRIPT;
    tag.async = true;
    tag.onload = () => resolve();
    tag.onerror = () => {
      loading = null;
      reject(new Error("Paystack could not load."));
    };
    document.head.appendChild(tag);
  });
  return loading;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await authFetch(path, { method: "POST", body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

export const startCheckout = (body: unknown) =>
  post<CheckoutStart>("/api/v1/checkout/", body);

export const verifyPayment = (reference: string) =>
  post<{
    reference: string;
    status: string;
    order_number: string | null;
    tracking_token: string | null;
  }>("/api/v1/checkout/verify/", { reference });

// Frees an unfinished checkout's promo hold (T-422); best effort.
export const cancelCheckout = (reference: string) =>
  authFetch("/api/v1/checkout/cancel/", {
    method: "POST",
    body: JSON.stringify({ reference }),
  }).catch(() => undefined);

export type PopupOutcome =
  | { kind: "success"; reference: string }
  | { kind: "cancelled" }
  | { kind: "error"; message: string };

// FR-CART-06: Paystack Inline offers card and bank transfer (D-092).
export async function openPaystack(start: CheckoutStart): Promise<PopupOutcome> {
  await loadPaystack();
  const Popup = window.PaystackPop;
  if (!Popup) return { kind: "error", message: "Paystack could not load." };
  return new Promise((resolve) => {
    new Popup().newTransaction({
      key: start.public_key,
      email: start.email,
      amount: start.amount,
      reference: start.reference,
      channels: start.channels,
      onSuccess: (tx) => resolve({ kind: "success", reference: tx.reference }),
      onCancel: () => resolve({ kind: "cancelled" }),
      onError: (error) =>
        resolve({ kind: "error", message: error.message ?? "Payment failed." }),
    });
  });
}
