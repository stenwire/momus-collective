import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DesignReview } from "@/components/orders/design-review";
import { EstimatedDelivery, OrderItems, OrderProgress } from "@/components/orders/order-summary";
import { fetchTrackedOrder } from "@/lib/orders/api";

// The token is the credential, so keep it out of search engines and out of
// the Referer header of any link followed from here.
export const metadata: Metadata = {
  title: "Track your order | momus collective",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ revised?: string }>;
};

export default async function TrackOrderPage({ params, searchParams }: Props) {
  const { token } = await params;
  const { revised } = await searchParams;
  const order = await fetchTrackedOrder(token);
  if (!order) notFound();
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10">
      <div>
        <h1 className="font-display text-[clamp(2.5rem,9vw,4.5rem)] uppercase leading-[0.9] tracking-tight">
          Order {order.order_number}
        </h1>
        <p className="font-mono text-xs uppercase tracking-widest text-laurel">Status: {order.status_label}</p>
      </div>
      {revised ? (
        <p role="status" className="text-sm text-ok">
          Thanks, we&apos;ve got your revised design and will review it shortly.
        </p>
      ) : null}
      <DesignReview order={order} token={token} />
      <EstimatedDelivery order={order} />
      <section aria-labelledby="progress-heading" className="flex flex-col gap-3">
        <h2 id="progress-heading" className="font-display text-3xl uppercase tracking-tight">Progress</h2>
        <OrderProgress order={order} />
      </section>
      <section aria-labelledby="items-heading" className="flex flex-col gap-3">
        <h2 id="items-heading" className="font-display text-3xl uppercase tracking-tight">Your order</h2>
        <OrderItems order={order} />
      </section>
    </main>
  );
}
