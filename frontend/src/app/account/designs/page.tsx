import type { Metadata } from "next";
import { LogoutButton } from "@/components/auth/logout-button";
import { DesignGallery } from "@/components/design/design-gallery";

export const metadata: Metadata = {
  title: "My designs | momus collective",
  robots: { index: false },
};

export default function MyDesignsPage() {
  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-zinc-50">My designs</h1>
        <LogoutButton />
      </div>
      <DesignGallery />
    </main>
  );
}
