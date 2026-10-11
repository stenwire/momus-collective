import type { Metadata } from "next";
import { AccountHeader } from "@/components/auth/account-header";
import { OrderHistory } from "@/components/orders/order-history";

export const metadata: Metadata = {
  title: "My orders | momus collective",
  robots: { index: false },
};

export default function MyOrdersPage() {
  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-8">
      <AccountHeader current="/account/orders" title="My orders" />
      <OrderHistory />
    </main>
  );
}
