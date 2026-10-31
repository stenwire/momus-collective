import type { Metadata } from "next";
import Link from "next/link";
import { PolicyPage } from "@/components/site/policy-page";

export const metadata: Metadata = { title: "Shipping and delivery | momus collective" };

export default function ShippingPage() {
  return (
    <PolicyPage
      title="Shipping and delivery"
      summary="Delivery estimates and fees are shown for your address before you pay."
      sections={[
        { title: "Where we deliver", content: <p>We currently deliver within Nigeria. International delivery is not available yet.</p> },
        { title: "Delivery estimates", content: <p>For Lagos, our expected delivery window is 1–3 days after an order is ready for dispatch. Delivery outside Lagos may take longer. Your order confirmation and tracking page are the best place to check the latest status.</p> },
        { title: "Delivery fees", content: <p>Fees depend on your delivery location and are shown during checkout before payment. We do not add a delivery charge after an order has been placed.</p> },
        { title: "Need help?", content: <p>Use the tracking link in your order confirmation. For a delivery issue, <Link href="/complaints" className="text-laurel underline">contact the store</Link> and include your order number.</p> },
      ]}
    />
  );
}