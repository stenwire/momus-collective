import { Activity, PackagePlus, Palette, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { AnalyticsDashboard } from "@/components/admin/analytics-dashboard";
import { NewDesignLink } from "@/components/design/new-design-link";

export default function AdminHome() {
  return (
    <main className="mx-auto flex w-full min-w-0 max-w-7xl flex-1 flex-col gap-6 px-4 py-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-5">
        <div>
          <h1 className="font-display text-4xl uppercase leading-none text-bone">Overview</h1>
          <p className="mt-2 text-sm text-bone-muted">Store activity and quick actions.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/orders" className="inline-flex min-h-11 items-center gap-2 border border-rule px-3 text-sm text-bone hover:border-bone-muted">
            <ShoppingBag className="size-4" aria-hidden="true" /> Orders
          </Link>
          <Link href="/admin/products" className="inline-flex min-h-11 items-center gap-2 border border-rule px-3 text-sm text-bone hover:border-bone-muted">
            <PackagePlus className="size-4" aria-hidden="true" /> New product
          </Link>
          <NewDesignLink href="/admin/design-studio" className="inline-flex min-h-11 items-center gap-2 bg-laurel px-3 text-sm font-medium text-ink hover:bg-laurel-hi">
            <Palette className="size-4" aria-hidden="true" /> New design
          </NewDesignLink>
        </div>
      </header>
      <section aria-labelledby="store-overview" className="flex flex-col gap-4">
        <h2 id="store-overview" className="flex items-center gap-2 font-mono text-xs uppercase text-bone-muted">
          <Activity className="size-4" aria-hidden="true" /> Store overview
        </h2>
        <AnalyticsDashboard />
      </section>
    </main>
  );
}
