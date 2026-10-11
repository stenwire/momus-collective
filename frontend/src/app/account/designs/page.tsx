import type { Metadata } from "next";
import { AccountHeader } from "@/components/auth/account-header";
import { DesignGallery } from "@/components/design/design-gallery";

export const metadata: Metadata = {
  title: "My designs | momus collective",
  robots: { index: false },
};

export default function MyDesignsPage() {
  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-8">
      <AccountHeader current="/account/designs" title="My designs" />
      <DesignGallery />
    </main>
  );
}
