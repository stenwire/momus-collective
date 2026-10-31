import { AdminDesignPricing } from "@/components/admin/design-pricing";

export default function AdminPricingPage() {
  return (
    <main className="mx-auto flex w-full min-w-0 max-w-3xl flex-1 flex-col gap-4 px-4 py-6">
      <h1 className="font-display text-3xl uppercase leading-none text-bone">Custom shirt pricing</h1>
      <p className="text-sm text-bone-muted">A custom shirt sells for its colour&apos;s blank cost plus print cost plus margin.</p>
      <AdminDesignPricing />
    </main>
  );
}
