import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ComingSoonSignup } from "./coming-soon-signup";

export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-8 px-4 py-8 sm:py-12 md:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)] md:gap-12">
      <div className="flex flex-col gap-5">
        <Link href="/shop" className="inline-flex min-h-11 w-fit items-center gap-2 text-sm text-bone-muted hover:text-bone">
          <ArrowLeft className="size-4" aria-hidden="true" /> Back to the shop
        </Link>
        <h1 className="font-display text-5xl uppercase leading-[0.9] sm:text-6xl">{title}<br /><span className="text-laurel">Coming soon.</span></h1>
        <p className="max-w-xl text-bone-muted">{description}</p>
        <p className="max-w-xl text-sm text-bone-muted">We’re expanding what can carry a good idea. Join the new-drop list for launch news.</p>
        <ComingSoonSignup />
      </div>
      <div className="relative mx-auto aspect-[4/5] w-full max-w-sm md:max-w-none">
        <Image src="/mascot-raven.png" alt="Momus’s raven mascot, perched and watching" fill priority sizes="(max-width: 768px) 80vw, 40vw" className="object-contain" />
      </div>
    </main>
  );
}