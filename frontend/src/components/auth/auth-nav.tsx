"use client";

import Link from "next/link";
import { useSignedIn } from "@/lib/auth/use-signed-in";

const LINK =
  "inline-flex min-h-11 min-w-11 items-center justify-center text-sm font-medium whitespace-nowrap text-zinc-300 hover:text-zinc-50";

// Log out lives on the account pages: four links overflow a 360px nav.
export function AuthNav() {
  const signedIn = useSignedIn();
  if (signedIn === null) return null;
  return signedIn ? (
    <Link href="/account/orders" className={LINK}>
      Account
    </Link>
  ) : (
    <Link href="/login" className={LINK}>
      Log in
    </Link>
  );
}
