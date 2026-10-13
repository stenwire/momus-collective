import type { Metadata } from "next";
import { CheckoutPage } from "@/components/checkout/checkout-page";

export const metadata: Metadata = {
  title: "Checkout | momus collective",
  robots: { index: false },
};

export default function Checkout() {
  return (
    <main className="flex flex-1 flex-col">
      <h1 className="px-4 pb-6 pt-10 font-display text-[clamp(3rem,10vw,6rem)] uppercase leading-[0.9] tracking-tight">
        Checkout
      </h1>
      <CheckoutPage />
    </main>
  );
}
