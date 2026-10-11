import Link from "next/link";
import { LogoutButton } from "./logout-button";

const TABS = [
  { href: "/account/orders", label: "Orders" },
  { href: "/account/designs", label: "Designs" },
  { href: "/account/wishlist", label: "Wishlist" },
];

export function AccountHeader({ current, title }: { current: string; title: string }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-zinc-50">{title}</h1>
        <LogoutButton />
      </div>
      <nav aria-label="Account" className="flex gap-2 border-b border-zinc-800">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={tab.href === current ? "page" : undefined}
            className={`inline-flex min-h-11 items-center border-b-2 px-3 text-sm font-medium ${
              tab.href === current
                ? "border-amber-400 text-zinc-50"
                : "border-transparent text-zinc-400 hover:text-zinc-100"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
