"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuthStore } from "@/lib/auth/store";

// UI gating only: every admin endpoint enforces is_staff itself (NFR-04).
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((s) => s.status);
  const staff = useAuthStore((s) => s.user?.is_staff === true);
  const router = useRouter();
  const pathname = usePathname() ?? "/admin";
  useEffect(() => {
    if (status === "signed-out") router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [status, router, pathname]);
  if (status !== "signed-in") return <p className="px-4 py-8 text-zinc-400">Checking access…</p>;
  if (!staff) {
    return (
      <p role="alert" className="px-4 py-8 text-zinc-300">
        This area is for the store&apos;s staff only.
      </p>
    );
  }
  return <>{children}</>;
}
