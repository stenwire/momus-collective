"use client";

import Link from "next/link";
import { Activity, BarChart3, ClipboardList, Coins, Gift, Package, Palette, ShieldAlert, Star, Tags, Users, UserRoundCheck } from "lucide-react";
import { usePathname } from "next/navigation";
import { NewDesignLink } from "@/components/design/new-design-link";

const LINKS = [
  { href: "/admin", label: "Overview", icon: Activity },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: Tags },
  { href: "/admin/pricing", label: "Custom pricing", icon: Coins },
  { href: "/admin/design-studio", label: "Design studio", icon: Palette },
  { href: "/admin/moderation", label: "Moderation", icon: UserRoundCheck },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/promo-codes", label: "Promo codes", icon: Gift },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/complaints", label: "Complaints", icon: ShieldAlert },
];

export function AdminNav() {
  const pathname = usePathname() ?? "";
  return (
    <aside className="shrink-0 border-b border-rule px-3 py-3 lg:w-60 lg:border-r lg:border-b-0 lg:px-4 lg:py-6">
      <p className="hidden px-3 pb-4 font-mono text-xs uppercase text-bone-muted lg:block">Store management</p>
      <nav aria-label="Admin" className="flex gap-1 overflow-x-auto lg:flex-col">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const current = href === "/admin" ? pathname === href : pathname.startsWith(href);
          const className = `inline-flex min-h-11 shrink-0 items-center gap-3 px-3 text-sm transition-colors ${
            current ? "bg-laurel/10 text-laurel" : "text-bone-muted hover:bg-ink-raised hover:text-bone"
          }`;
          return href === "/admin/design-studio" ? (
          <NewDesignLink
            key={href}
            href={href}
            ariaCurrent={current ? "page" : undefined}
            className={className}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />{label}
          </NewDesignLink>
        ) : (
          <Link
            key={href}
            href={href}
            aria-current={current ? "page" : undefined}
            className={className}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />{label}
          </Link>
        );
        })}
      </nav>
    </aside>
  );
}
