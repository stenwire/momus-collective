"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { errorMessages } from "@/lib/auth/api";
import { useSignedIn } from "@/lib/auth/use-signed-in";
import { useCartDrawer } from "@/lib/cart/drawer-store";
import { SIZES } from "@/lib/constants";
import { formatNaira } from "@/lib/format";
import {
  fetchWishlist,
  moveToCart,
  removeFromWishlist,
  type WishlistEntry,
} from "@/lib/wishlist/api";
import { buttonClasses } from "@/components/ui/button";

const SELECT =
  "min-h-11 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-base text-zinc-50 focus:border-amber-400 focus:outline-none";
const ACTION =
  "min-h-11 rounded-md border border-zinc-700 px-4 text-sm text-zinc-100 hover:border-zinc-500 disabled:opacity-60";

function WishlistItem({
  entry,
  onMoved,
}: {
  entry: WishlistEntry;
  onMoved: (slogan: string) => void;
}) {
  const { product } = entry;
  const queryClient = useQueryClient();
  const [size, setSize] = useState("");
  const [color, setColor] = useState(product.shirt_colors[0] ?? "");
  const [errors, setErrors] = useState<string[]>([]);
  const sizeId = useId();
  const colorId = useId();
  const done = (entries: WishlistEntry[]) => queryClient.setQueryData(["wishlist"], entries);
  const move = useMutation({
    mutationFn: () => moveToCart(product.id, size, color),
    onSuccess: async (entries) => {
      done(entries);
      await queryClient.invalidateQueries({ queryKey: ["cart"] });
      onMoved(product.slogan);
    },
    onError: (error) => setErrors(errorMessages(error)),
  });
  const remove = useMutation({
    mutationFn: () => removeFromWishlist(product.id),
    onSuccess: done,
    onError: (error) => setErrors(errorMessages(error)),
  });
  const busy = move.isPending || remove.isPending;

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-zinc-800 p-4">
      <div className="flex gap-3">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-md bg-zinc-900">
          {product.image ? (
            <Image src={product.image} alt={product.slogan} fill sizes="80px" className="object-cover" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-medium text-zinc-50">
            <Link href={`/product/${product.slug}`} className="hover:underline">
              {product.slogan}
            </Link>
          </h2>
          <p className="text-sm text-amber-400">{formatNaira(product.price)}</p>
          {!product.available ? (
            <p className="text-xs text-red-400">No longer available</p>
          ) : null}
        </div>
      </div>
      {product.available ? (
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor={sizeId} className="text-xs text-zinc-400">
              Size
            </label>
            <select id={sizeId} value={size} onChange={(e) => setSize(e.target.value)} className={SELECT}>
              <option value="">Choose</option>
              {SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          {product.shirt_colors.length > 1 ? (
            <div className="flex flex-col gap-1">
              <label htmlFor={colorId} className="text-xs text-zinc-400">
                Colour
              </label>
              <select id={colorId} value={color} onChange={(e) => setColor(e.target.value)} className={SELECT}>
                {product.shirt_colors.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <button
            type="button"
            disabled={busy || !size}
            onClick={() => {
              setErrors([]);
              move.mutate();
            }}
            aria-label={`Move ${product.slogan} to bag`}
            className={buttonClasses({ size: "sm" })}
          >
            Move to bag
          </button>
        </div>
      ) : null}
      <button
        type="button"
        disabled={busy}
        onClick={() => remove.mutate()}
        aria-label={`Remove ${product.slogan} from wishlist`}
        className={`${ACTION} self-start`}
      >
        Remove
      </button>
      {errors.length ? (
        <p role="alert" className="text-sm text-red-400">
          {errors.join(" ")}
        </p>
      ) : null}
    </li>
  );
}

// FR-USR-05: hearted products, each movable to the bag in a chosen size.
export function Wishlist() {
  const signedIn = useSignedIn();
  const router = useRouter();
  const openBag = useCartDrawer((s) => s.setOpen);
  const [moved, setMoved] = useState("");
  const wishlist = useQuery({
    queryKey: ["wishlist"],
    queryFn: fetchWishlist,
    enabled: signedIn === true,
  });

  const wasSignedIn = useRef(false);
  useEffect(() => {
    if (signedIn) wasSignedIn.current = true;
    if (signedIn === false && !wasSignedIn.current) {
      router.replace("/login?next=/account/wishlist");
    }
  }, [signedIn, router]);

  if (!signedIn) return null;
  if (wishlist.isError) {
    return <p className="text-zinc-400">Your wishlist could not load. Refresh to try again.</p>;
  }
  if (!wishlist.data) return <p className="text-zinc-400">Loading your wishlist…</p>;
  return (
    <div className="flex flex-col gap-4">
      <div aria-live="polite" className="flex items-center gap-3 text-sm text-emerald-400">
        {moved ? (
          <>
            <span>Moved {moved} to your bag.</span>
            <button type="button" onClick={() => openBag(true)} className="min-h-11 text-amber-400 underline">
              View bag
            </button>
          </>
        ) : null}
      </div>
      {wishlist.data.length === 0 ? (
        <p className="text-zinc-400">
          Nothing saved yet. Tap the heart on any shirt to keep it here.{" "}
          <Link href="/shop" className="inline-flex min-h-11 items-center text-amber-400 underline">
            Browse the shop
          </Link>
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {wishlist.data.map((entry) => (
            <WishlistItem key={entry.product.id} entry={entry} onMoved={setMoved} />
          ))}
        </ul>
      )}
    </div>
  );
}
