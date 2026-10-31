"use client";

import Link from "next/link";
import { useDesignStore } from "@/lib/design/store";

export function NewDesignLink({
  children,
  className,
  ariaCurrent,
  href = "/design",
}: {
  children: React.ReactNode;
  className: string;
  ariaCurrent?: "page";
  href?: string;
}) {
  const startNew = useDesignStore((state) => state.startNew);
  return (
    <Link
      href={href}
      onClick={() => startNew()}
      aria-current={ariaCurrent}
      className={className}
    >
      {children}
    </Link>
  );
}