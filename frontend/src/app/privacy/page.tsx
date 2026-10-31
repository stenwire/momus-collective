import type { Metadata } from "next";
import Link from "next/link";
import { PolicyPage } from "@/components/site/policy-page";

export const metadata: Metadata = { title: "Privacy | momus collective" };

export default function PrivacyPage() {
  return (
    <PolicyPage
      title="Privacy"
      summary="We use the information needed to run your account, make your order, and keep you updated."
      sections={[
        { title: "Information you provide", content: <p>This can include your name, email address, phone number, delivery address, saved designs, product reviews, and order details. Newsletter subscribers provide an email address.</p> },
        { title: "How we use it", content: <p>We use these details to manage accounts, prepare and deliver orders, provide tracking and support, keep saved designs available, prevent misuse, and send requested store updates.</p> },
        { title: "Payments", content: <p>Payments are processed by Paystack. The storefront receives payment confirmation and a transaction reference; payment credentials are handled by the payment provider.</p> },
        { title: "Browser storage", content: <p>Authentication uses secure cookies. Your browser may also keep your bag, unfinished design, and display preference so you can continue where you left off.</p> },
        { title: "Questions or requests", content: <p>For a privacy question or a request about your account information, use the <Link href="/complaints" className="text-laurel underline">complaint and support form</Link> or reply to an order email.</p> },
      ]}
    />
  );
}