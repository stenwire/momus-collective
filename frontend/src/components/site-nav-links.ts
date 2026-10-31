import { cn } from "@/lib/cn";

export const NAV_LINKS = [
  { href: "/shop", label: "Shop" },
  { href: "/design", label: "Design" },
] as const;

export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

// The active link carries a laurel underline drawn by a pseudo-element.
export function navLinkClasses(active: boolean) {
  return cn(
    "relative inline-flex min-h-11 min-w-11 items-center justify-center font-mono text-xs uppercase tracking-widest whitespace-nowrap transition-colors duration-150 after:absolute after:inset-x-0 after:bottom-2 after:h-px after:origin-left after:bg-laurel after:transition-transform after:duration-200 motion-reduce:after:transition-none",
    active
      ? "text-bone after:scale-x-100"
      : "text-bone-muted after:scale-x-0 hover:text-bone hover:after:scale-x-100",
  );
}
