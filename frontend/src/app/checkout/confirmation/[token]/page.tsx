import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GuestAccountOffer } from "@/components/checkout/guest-account-offer";
import { EstimatedDelivery, OrderItems } from "@/components/orders/order-summary";
import { fetchTrackedOrder } from "@/lib/orders/api";

export const metadata: Metadata = {
  title: "Order confirmed | momus collective",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type Props = { params: Promise<{ token: string }> };

// FR-CART-09: number, summary, estimated delivery and the tracking link.
export default async function ConfirmationPage({ params }: Props) {
  const { token } = await params;
  const order = await fetchTrackedOrder(token);
  if (!order) notFound();
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-zinc-50">Thank you, your order is confirmed</h1>
        <p className="text-sm text-zinc-300">
          Order number <span className="font-semibold text-zinc-50">{order.order_number}</span>
        </p>
        <p className="text-sm text-zinc-400">We&apos;ve emailed you a confirmation with these details.</p>
      </div>
      <EstimatedDelivery order={order} />
      <Link
        href={`/track/${token}`}
        className="flex min-h-11 items-center justify-center rounded-md border border-zinc-600 px-6 font-medium text-zinc-50 hover:border-zinc-400"
      >
        Track your order
      </Link>
      <section aria-labelledby="summary-heading" className="flex flex-col gap-3">
        <h2 id="summary-heading" className="text-lg font-semibold text-zinc-50">Order summary</h2>
        <OrderItems order={order} />
      </section>
      <GuestAccountOffer />
    </main>
  );
}
