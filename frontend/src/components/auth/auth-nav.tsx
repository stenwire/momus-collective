"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSignedIn } from "@/lib/auth/use-signed-in";
import { useAuthStore } from "@/lib/auth/store";
import { navLinkClasses } from "../site-nav-links";

export function AuthNav({ className }: { className?: string }) {
  const signedIn = useSignedIn();
  const staff = useAuthStore((s) => s.user?.is_staff === true);
  const pathname = usePathname();
  if (signedIn === null) return null;
  const href = signedIn ? "/account/orders" : "/login";
  const active = signedIn ? pathname.startsWith("/account") : pathname === "/login";
  return (
    <>
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={className ?? navLinkClasses(active)}
      >
        {signedIn ? "Account" : "Log in"}
      </Link>
      {signedIn && staff ? (
        <Link
          href="/admin"
          aria-current={pathname.startsWith("/admin") ? "page" : undefined}
          className={className ?? navLinkClasses(pathname.startsWith("/admin"))}
        >
          Admin
        </Link>
      ) : null}
    </>
  );
}
