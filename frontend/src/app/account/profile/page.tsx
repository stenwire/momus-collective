import type { Metadata } from "next";
import { AccountHeader } from "@/components/auth/account-header";
import { AccountProfile } from "@/components/auth/account-profile";

export const metadata: Metadata = {
  title: "Account profile | momus collective",
  robots: { index: false },
};

export default function AccountProfilePage() {
  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-8">
      <AccountHeader current="/account/profile" title="Your account" />
      <AccountProfile />
    </main>
  );
}