import type { Metadata } from "next";
import { AccountHeader } from "@/components/auth/account-header";
import { Wishlist } from "@/components/wishlist/wishlist";

export const metadata: Metadata = {
  title: "My wishlist | momus collective",
  robots: { index: false },
};

export default function MyWishlistPage() {
  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-8">
      <AccountHeader current="/account/wishlist" title="My wishlist" />
      <Wishlist />
    </main>
  );
}
