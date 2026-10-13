import Link from "next/link";
import { Raven } from "@/components/brand/raven";
import { buttonClasses } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto grid w-full max-w-5xl flex-1 items-center gap-8 px-4 py-12 md:grid-cols-[1fr_auto]">
      <div className="flex flex-col gap-6">
        <p className="font-mono text-xs uppercase tracking-widest text-laurel">Error 404</p>
        <h1 className="font-display text-[clamp(3rem,12vw,7rem)] uppercase leading-[0.9] tracking-tight">
          Exiled from Olympus.
        </h1>
        <p className="max-w-md text-bone-muted">
          Even the gods couldn&apos;t find this page. It may have been moved, sold out, or
          filtered out.
        </p>
        <div className="flex flex-wrap gap-4">
          <Link href="/shop" className={buttonClasses()}>
            Back to the shop
          </Link>
          <Link href="/" className={buttonClasses({ variant: "secondary" })}>
            Home
          </Link>
        </div>
      </div>
      <Raven className="mx-auto w-44 md:w-64" />
    </main>
  );
}
