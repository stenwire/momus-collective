"use client";

import { useSyncExternalStore } from "react";
import { useSignedIn } from "@/lib/auth/use-signed-in";
import { parseGuestDetails, readGuestDetailsRaw } from "@/lib/checkout/guest-details";
import { CreateAccountOffer } from "./create-account-offer";

const subscribe = () => () => {};

export function GuestAccountOffer() {
  const signedIn = useSignedIn();
  const raw = useSyncExternalStore(subscribe, readGuestDetailsRaw, () => null);
  const details = parseGuestDetails(raw);
  if (signedIn !== false || !details) return null;
  return <CreateAccountOffer details={details} />;
}
