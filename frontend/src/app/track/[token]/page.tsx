import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EstimatedDelivery, OrderItems, OrderProgress } from "@/components/orders/order-summary";
import { fetchTrackedOrder } from "@/lib/orders/api";

// The token is the credential, so keep it out of search engines and out of
// the Referer header of any link followed from here.
export const metadata: Metadata = {
  title: "Track your order | momus collective",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type Props = { params: Promise<{ token: string }> };

export default async function TrackOrderPage({ params }: Props) {
  const { token } = await params;
  const order = await fetchTrackedOrder(token);
  if (!order) notFound();
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-50">Order {order.order_number}</h1>
        <p className="text-sm text-zinc-400">Status: {order.status_label}</p>
      </div>
      <EstimatedDelivery order={order} />
      <section aria-labelledby="progress-heading" className="flex flex-col gap-3">
        <h2 id="progress-heading" className="text-lg font-semibold text-zinc-50">Progress</h2>
        <OrderProgress order={order} />
      </section>
      <section aria-labelledby="items-heading" className="flex flex-col gap-3">
        <h2 id="items-heading" className="text-lg font-semibold text-zinc-50">Your order</h2>
        <OrderItems order={order} />
      </section>
    </main>
  );
}
