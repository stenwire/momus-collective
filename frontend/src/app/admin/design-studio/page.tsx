import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { DesignTool } from "@/components/design/design-tool";
import { fetchDesignOptions, fetchDesignPricing } from "@/lib/api";
import { getQueryClient } from "@/lib/get-query-client";

export default async function AdminDesignStudioPage() {
  const queryClient = getQueryClient();
  await Promise.all([
    queryClient.prefetchQuery({ queryKey: ["design-options"], queryFn: fetchDesignOptions }),
    queryClient.prefetchQuery({ queryKey: ["design-pricing"], queryFn: fetchDesignPricing }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <main className="flex min-w-0 flex-1 flex-col">
        <h1 className="px-4 py-6 font-display text-3xl uppercase leading-none text-bone">Create a shirt design</h1>
        <DesignTool />
      </main>
    </HydrationBoundary>
  );
}