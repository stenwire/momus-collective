import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GuestAccountOffer } from "@/components/checkout/guest-account-offer";
import { PaidStamp } from "@/components/checkout/paid-stamp";
import { buttonClasses } from "@/components/ui/button";
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
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-10">
      <PaidStamp />
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-[clamp(2.5rem,9vw,4rem)] uppercase leading-[0.9] tracking-tight">
          Thank you, your order is confirmed
        </h1>
        <p className="font-mono text-sm uppercase tracking-widest text-bone-muted">
          Order number <span className="font-bold text-laurel">{order.order_number}</span>
        </p>
        <p className="text-sm text-bone-muted">We&apos;ve emailed you a confirmation with these details.</p>
      </div>
      <EstimatedDelivery order={order} />
      <Link href={`/track/${token}`} className={buttonClasses({ variant: "secondary", block: true })}>
        Track your order
      </Link>
      <section aria-labelledby="summary-heading" className="flex flex-col gap-3 border-t border-rule pt-6">
        <h2 id="summary-heading" className="font-display text-3xl uppercase tracking-tight">Order summary</h2>
        <OrderItems order={order} />
      </section>
      <GuestAccountOffer />
    </main>
  );
}
