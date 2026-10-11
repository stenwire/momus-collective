import { PromoCodes } from "@/components/admin/promo-codes";

export default function AdminPromoCodesPage() {
  return (
    <main className="mx-auto flex w-full min-w-0 max-w-3xl flex-1 flex-col gap-4 px-4 py-6">
      <h1 className="text-2xl font-semibold text-zinc-50">Promo codes</h1>
      <PromoCodes />
    </main>
  );
}
