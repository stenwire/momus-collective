"use client";

import { useCartNotice } from "@/lib/cart/notice-store";

// T-418: a guest line the server couldn't take at sign-in is named, not
// silently dropped.
export function CartNotice() {
  const { dropped, setDropped } = useCartNotice();
  if (dropped.length === 0) return null;
  return (
    <div
      role="alert"
      className="mx-4 mt-3 flex items-start justify-between gap-3 border border-laurel/50 bg-laurel/10 p-3 text-sm text-bone"
    >
      <div>
        <p className="font-medium">Some items from your bag couldn&apos;t be kept:</p>
        <ul className="mt-1 list-disc pl-5">
          {dropped.map((d) => (
            <li key={d.title}>
              {d.title}: {d.reason}
            </li>
          ))}
        </ul>
      </div>
      <button
        type="button"
        onClick={() => setDropped([])}
        aria-label="Dismiss"
        className="flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-laurel/20"
      >
        ✕
      </button>
    </div>
  );
}
