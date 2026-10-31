"use client";

import Link from "next/link";
import { Raven } from "@/components/brand/raven";
import { Button, buttonClasses } from "@/components/ui/button";

export default function RouteError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto grid w-full max-w-5xl flex-1 items-center gap-8 px-4 py-12 md:grid-cols-[1fr_auto]">
      <div className="flex flex-col gap-6">
        <p className="font-mono text-xs uppercase tracking-widest text-error">Something broke</p>
        <h1 className="font-display text-[clamp(3rem,12vw,7rem)] uppercase leading-[0.9] tracking-tight">
          Zeus did this.
        </h1>
        <p className="max-w-md text-bone-muted">
          The page hit an error on our side. Try again, and if it keeps happening, head back to
          the shop.
        </p>
        <div className="flex flex-wrap gap-4">
          <Button onClick={reset}>Try again</Button>
          <Link href="/shop" className={buttonClasses({ variant: "secondary" })}>
            Back to the shop
          </Link>
        </div>
      </div>
      <Raven className="mx-auto w-44 md:w-64" />
    </main>
  );
}
