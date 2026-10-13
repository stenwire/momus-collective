"use client";

import * as m from "motion/react-m";
import Link from "next/link";
import { useState } from "react";
import { spring } from "@/lib/motion";

const TABS = [
  { href: "/account/orders", label: "Orders" },
  { href: "/account/designs", label: "Designs" },
  { href: "/account/wishlist", label: "Wishlist" },
];

// Each tab is its own page, so the underline moves on tap, while the next
// page loads, rather than jumping once it arrives.
export function AccountTabs({ current }: { current: string }) {
  const [selected, setSelected] = useState(current);
  return (
    <nav aria-label="Account" className="flex gap-2 border-b border-rule">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          onClick={() => setSelected(tab.href)}
          aria-current={tab.href === current ? "page" : undefined}
          className={`relative inline-flex min-h-11 items-center px-3 font-mono text-xs uppercase tracking-widest ${
            tab.href === selected ? "text-bone" : "text-bone-muted hover:text-bone"
          }`}
        >
          {tab.label}
          {tab.href === selected ? (
            <m.span
              layoutId="account-tab"
              transition={spring.snap}
              aria-hidden="true"
              className="absolute inset-x-0 -bottom-px h-0.5 bg-laurel"
            />
          ) : null}
        </Link>
      ))}
    </nav>
  );
}
