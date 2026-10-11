"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth/store";
import { useSignedIn } from "@/lib/auth/use-signed-in";
import { useDesignStore } from "@/lib/design/store";

const LINK =
  "inline-flex min-h-11 items-center text-sm font-medium text-zinc-300 hover:text-zinc-50";

export function AuthNav() {
  const signedIn = useSignedIn();
  const signOut = useAuthStore((s) => s.signOut);
  const router = useRouter();

  if (signedIn === null) return null;
  if (!signedIn) {
    return (
      <Link href="/login" className={LINK}>
        Log in
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={() => {
        signOut();
        // The next person on this device must not keep editing this
        // account's saved design.
        useDesignStore.setState({ savedId: null, name: "" });
        router.push("/");
      }}
      className={LINK}
    >
      Log out
    </button>
  );
}
