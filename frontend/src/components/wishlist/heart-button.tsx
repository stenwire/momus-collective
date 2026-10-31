"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type CSSProperties } from "react";
import { haptic } from "@/lib/haptics";
import { useSignedIn } from "@/lib/auth/use-signed-in";
import { addToWishlist, fetchWishlist, removeFromWishlist } from "@/lib/wishlist/api";

const BUTTON =
  "flex size-11 items-center justify-center bg-ink/80 transition-[color,transform] duration-150 hover:bg-ink active:scale-90 motion-reduce:transition-none motion-reduce:active:scale-100";

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2}>
      <path d="M12 21s-7.5-4.6-9.5-9.2C1.2 8.6 3.3 5 6.8 5c2 0 3.4 1.1 4.2 2.3h2C13.8 6.1 15.2 5 17.2 5c3.5 0 5.6 3.6 4.3 6.8C19.5 16.4 12 21 12 21z" />
    </svg>
  );
}

const LEAVES = [0, 60, 120, 180, 240, 300];

// Six laurel leaves spray out when a shirt is saved.
function LaurelBurst() {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0">
      {LEAVES.map((angle) => (
        <span
          key={angle}
          data-testid="laurel-leaf"
          className="absolute left-1/2 top-1/2 -ml-1 -mt-1.5 h-3 w-2 animate-burst rounded-[100%_0] bg-laurel"
          style={{ "--angle": `${angle}deg` } as CSSProperties}
        />
      ))}
    </span>
  );
}

function MemberHeart({ productId, slogan }: { productId: string; slogan: string }) {
  const queryClient = useQueryClient();
  const [bursts, setBursts] = useState(0);
  const wishlist = useQuery({ queryKey: ["wishlist"], queryFn: fetchWishlist });
  const saved = wishlist.data?.some((entry) => entry.product.id === productId) ?? false;
  const toggle = useMutation({
    mutationFn: () => (saved ? removeFromWishlist(productId) : addToWishlist(productId)),
    meta: { success: saved ? "Removed from your wishlist." : "Saved to your wishlist.", label: saved ? "Removed" : "Saved" },
    onSuccess: (entries) => {
      queryClient.setQueryData(["wishlist"], entries);
      if (entries.some((entry) => entry.product.id === productId)) setBursts((n) => n + 1);
    },
  });
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={`Save ${slogan} to wishlist`}
      disabled={toggle.isPending || !wishlist.data}
      onClick={() => {
        haptic("tick");
        toggle.mutate();
      }}
      className={`relative ${BUTTON} ${saved ? "text-laurel" : "text-bone"}`}
    >
      <Heart filled={saved} />
      {bursts > 0 ? <LaurelBurst key={bursts} /> : null}
    </button>
  );
}

// FR-USR-05: the wishlist lives on the account, so a guest's heart asks
// them to log in and brings them back here.
export function HeartButton({ productId, slogan }: { productId: string; slogan: string }) {
  const signedIn = useSignedIn();
  const pathname = usePathname() ?? "/";
  if (signedIn === null) return null;
  if (!signedIn) {
    return (
      <Link
        href={`/login?next=${encodeURIComponent(pathname)}`}
        aria-label={`Log in to save ${slogan} to your wishlist`}
        className={`${BUTTON} text-bone`}
      >
        <Heart filled={false} />
      </Link>
    );
  }
  return <MemberHeart productId={productId} slogan={slogan} />;
}
