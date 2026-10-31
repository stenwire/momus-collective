import Link from "next/link";
import { Raven } from "@/components/brand/raven";
import { RavenTilt } from "@/components/home/raven-tilt";
import { buttonClasses } from "@/components/ui/button";
import { KineticText } from "@/components/ui/kinetic-text";

export function Hero() {
  return (
    <section className="marble relative overflow-hidden border-b border-rule">
      {/* The exposed column grid: four hairline columns behind the hero. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 hidden grid-cols-4 md:grid [&>span]:border-l [&>span]:border-rule"
      >
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 md:flex-row md:items-center md:justify-between md:py-20">
        <div className="order-2 flex flex-col gap-6 md:order-1">
          <p className="font-mono text-xs uppercase tracking-widest text-laurel">
            № 001 — Satire, printed in Lagos
          </p>
          <h1 className="font-display text-[clamp(3.25rem,13vw,8.5rem)] uppercase leading-[0.88] tracking-tight">
            <KineticText text="dressed up," className="block" stepMs={80} />{" "}
            <span className="relative inline-block text-laurel">
              <KineticText text="filtered out." delayMs={160} stepMs={80} />
              <span
                aria-hidden="true"
                data-testid="strike"
                className="absolute inset-x-0 top-[48%] h-[0.07em] origin-left animate-strike bg-bone"
              />
            </span>
          </h1>
          <p className="max-w-md text-bone-muted">
            Slogan t-shirts for people who say the quiet part out loud — philosophy, tech, dad
            jokes and worse. Or design your own.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/shop" className={buttonClasses({ size: "lg" })}>
              Shop All Products
            </Link>
            <Link href="/design" className={buttonClasses({ size: "lg", variant: "secondary" })}>
              Design your own
            </Link>
          </div>
        </div>
        {/* The tilt's transform isolates its contents, so the blend that
            drops the raven's matte must sit on the tilting wrapper. */}
        <RavenTilt className="order-1 mx-auto w-40 shrink-0 mix-blend-lighten md:order-2 md:mx-0 md:w-72">
          <Raven priority sizes="(min-width: 768px) 288px, 160px" />
        </RavenTilt>
      </div>
    </section>
  );
}
