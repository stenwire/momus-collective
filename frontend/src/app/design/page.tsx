import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import type { Metadata } from "next";
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
        <h1 className="px-4 pt-8 pb-4 text-2xl font-semibold text-zinc-50">
          Design your own
        </h1>
        <DesignTool />
      </main>
    </HydrationBoundary>
  );
}
