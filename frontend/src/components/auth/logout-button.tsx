"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth/store";
import { useDesignStore } from "@/lib/design/store";

export function LogoutButton() {
  const signOut = useAuthStore((s) => s.signOut);
  const router = useRouter();
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
      className="min-h-11 rounded-md border border-zinc-700 px-4 text-sm text-zinc-300 hover:border-zinc-500"
    >
      Log out
    </button>
  );
}
