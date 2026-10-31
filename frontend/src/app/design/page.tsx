import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import type { Metadata } from "next";
import Link from "next/link";
import { Raven } from "@/components/brand/raven";
import { DesignTool } from "@/components/design/design-tool";
import { fetchDesignOptions, fetchDesignPricing } from "@/lib/api";
import { getQueryClient } from "@/lib/get-query-client";

export const metadata: Metadata = {
  title: "Design your own | momus collective",
  description:
    "Put your own slogan on a momus collective shirt with the live design tool.",
};

export default async function DesignPage() {
  const queryClient = getQueryClient();
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["design-options"],
      queryFn: fetchDesignOptions,
    }),
    queryClient.prefetchQuery({
      queryKey: ["design-pricing"],
      queryFn: fetchDesignPricing,
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <main className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-6xl items-end justify-between gap-4 px-4 pb-6 pt-10">
          <div className="flex flex-col gap-2">
            <p className="font-mono text-xs uppercase tracking-widest text-laurel">
              Your words, our cotton
            </p>
            <h1 className="font-display text-[clamp(3rem,10vw,6rem)] uppercase leading-[0.9] tracking-tight">
              Design your own
            </h1>
          </div>
          {/* PRD L31: the raven as a decorative element on the design tool. */}
          <Raven className="w-20 shrink-0 md:w-28" sizes="112px" />
        </div>
        <p className="mx-auto w-full max-w-6xl px-4 pb-4 text-sm text-bone-muted">
          <Link href="/account/designs" className="text-laurel underline">View your saved designs</Link>
        </p>
        <DesignTool />
      </main>
    </HydrationBoundary>
  );
}
