"use client";

import { useRouter } from "next/navigation";

export function ProductModal({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black md:bg-black/70 md:p-4"
      onClick={() => router.back()}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="h-full w-full overflow-y-auto bg-zinc-950 shadow-xl md:h-auto md:max-h-[90vh] md:w-full md:max-w-3xl md:rounded-xl"
      >
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Close"
          className="sticky left-full top-3 z-10 flex h-11 w-11 -translate-x-3 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}
