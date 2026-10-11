"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [{ href: "/admin/orders", label: "Orders" }];

export function AdminNav() {
  const pathname = usePathname() ?? "";
  return (
    <nav aria-label="Admin" className="flex gap-2 overflow-x-auto border-b border-zinc-800 px-4">
      {LINKS.map((link) => {
        const current = pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={current ? "page" : undefined}
            className={`inline-flex min-h-11 shrink-0 items-center border-b-2 px-3 text-sm font-medium ${
              current ? "border-amber-400 text-zinc-50" : "border-transparent text-zinc-400 hover:text-zinc-100"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
