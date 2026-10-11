import type { Metadata } from "next";
import { CheckoutPage } from "@/components/checkout/checkout-page";

export const metadata: Metadata = {
  title: "Checkout | momus collective",
  robots: { index: false },
};

export default function Checkout() {
  return (
    <main className="flex flex-1 flex-col">
      <h1 className="px-4 pt-8 pb-4 text-2xl font-semibold text-zinc-50">Checkout</h1>
      <CheckoutPage />
    </main>
  );
}
