import type { Metadata } from "next";
import Link from "next/link";
import { PolicyPage } from "@/components/site/policy-page";

export const metadata: Metadata = { title: "Returns and order issues | momus collective" };

export default function ReturnsPage() {
  return (
    <PolicyPage
      title="Returns and order issues"
      summary="If something is wrong with your order, tell us so we can review it."
      sections={[
        { title: "Tell us what happened", content: <p>If your order arrives damaged, incorrect, or materially different from what you ordered, contact us promptly. Include your order number and clear photos where relevant so we can investigate.</p> },
        { title: "Custom designs", content: <p>Custom designs are checked before printing. If a design is rejected, you can choose to revise it or request a refund as described in the order update.</p> },
        { title: "Before you send an item back", content: <p>Please contact us before returning anything. The store does not currently publish a general return window or a self-service returns address; we will review the details of your order and advise you on the next step.</p> },
        { title: "Contact", content: <p><Link href="/complaints" className="text-laurel underline">File an order complaint</Link> or reply to your order confirmation email with the order number.</p> },
      ]}
    />
  );
}