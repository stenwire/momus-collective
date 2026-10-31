import type { Metadata } from "next";
import { PolicyPage } from "@/components/site/policy-page";
import { ComplaintForm } from "@/components/site/complaint-form";

export const metadata: Metadata = { title: "File a complaint | momus collective" };

export default function ComplaintsPage() {
  return (
    <PolicyPage
      title="File a complaint"
      summary="Tell us what happened. Include your order number if your message is about a purchase."
      sections={[
        {
          title: "Send the details",
          content: <ComplaintForm />,
        },
      ]}
    />
  );
}