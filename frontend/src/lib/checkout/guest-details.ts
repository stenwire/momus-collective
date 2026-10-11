import type { GuestDetails } from "@/components/checkout/create-account-offer";

const KEY = "momus-guest-details";

// Carries the guest's details to the confirmation page for the account
// offer (FR-CART-05); the order endpoints never return them (SEC-14).
export function saveGuestDetails(details: GuestDetails) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(details));
  } catch {}
}

// The raw string, so useSyncExternalStore sees a stable snapshot.
export function readGuestDetailsRaw(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function parseGuestDetails(raw: string | null): GuestDetails | null {
  try {
    return raw ? (JSON.parse(raw) as GuestDetails) : null;
  } catch {
    return null;
  }
}
