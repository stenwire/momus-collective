"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Sheet } from "@/components/ui/sheet";

// Closing plays the exit first, then leaves the intercepted route.
export function ProductModal({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const close = useCallback(() => setOpen(false), []);

  return (
    <Sheet
      open={open}
      onClose={close}
      onExitComplete={() => router.back()}
      variant="modal"
      label="Product details"
    >
      {children}
    </Sheet>
  );
}
