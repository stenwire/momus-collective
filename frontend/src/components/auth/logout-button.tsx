"use client";

import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth/api";
import { useDesignStore } from "@/lib/design/store";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await logout().catch(() => {});
        // The next person on this device must not see or edit this
        // account's design.
        useDesignStore.getState().reset();
        router.push("/");
      }}
      className="min-h-11 border border-rule px-4 text-sm text-bone-muted hover:border-bone-muted"
    >
      Log out
    </button>
  );
}
