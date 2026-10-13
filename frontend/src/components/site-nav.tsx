"use client";

import { Menu } from "lucide-react";
import { useMotionValueEvent, useScroll } from "motion/react";
import * as m from "motion/react-m";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { spring } from "@/lib/motion";
import { AuthNav } from "./auth/auth-nav";
import { CartButton } from "./cart/cart-button";
import { NAV_LINKS, isActive, navLinkClasses } from "./site-nav-links";
import { IconButton } from "./ui/icon-button";
import { Sheet } from "./ui/sheet";

const HIDE_AFTER_PX = 120;

export function SiteNav() {
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const [hidden, setHidden] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { scrollY } = useScroll();

  // Hide while scrolling down, return on the way up; never while the
  // header holds focus, so a keyboard user's focus is not obscured.
  useMotionValueEvent(scrollY, "change", (y) => {
    const previous = scrollY.getPrevious() ?? 0;
    const focusedInside = headerRef.current?.contains(document.activeElement) ?? false;
    setHidden(y > previous && y > HIDE_AFTER_PX && !focusedInside);
  });

  return (
    <>
      <m.header
        ref={headerRef}
        onFocusCapture={() => setHidden(false)}
        animate={{ y: hidden ? "-100%" : 0 }}
        transition={spring.settle}
        className="sticky top-0 z-40 flex items-center justify-between border-b border-rule bg-ink px-4 py-2"
      >
        <Link href="/" className="flex min-h-11 items-center" aria-label="momus collective, home">
          {/* lighten drops the PNG's black matte into the ink background */}
          <Image
            src="/wordmark.png"
            alt=""
            width={140}
            height={41}
            priority
            className="h-auto w-[110px] mix-blend-lighten md:w-[140px]"
          />
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1 md:gap-4">
          <div className="hidden items-center gap-4 md:flex">
            {NAV_LINKS.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={navLinkClasses(active)}
                >
                  {link.label}
                </Link>
              );
            })}
            <AuthNav />
          </div>
          <CartButton />
          <IconButton
            label="Menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
            className="md:hidden"
          >
            <Menu className="size-6" strokeWidth={1.6} aria-hidden="true" />
          </IconButton>
        </nav>
      </m.header>

      <Sheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        variant="modal"
        label="Menu"
        closeLabel="Close menu"
      >
        <nav
          aria-label="Mobile"
          onClickCapture={(e) => {
            if ((e.target as HTMLElement).closest("a")) setMenuOpen(false);
          }}
          className="flex min-h-full flex-col justify-between px-6 pb-10"
        >
          <ul className="flex flex-col">
            {[...NAV_LINKS, { href: "/", label: "Home" }].map((link, i) => (
              <m.li
                key={link.href}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring.settle, delay: 0.05 + i * 0.05 }}
                className="border-b border-rule"
              >
                <Link
                  href={link.href}
                  aria-current={isActive(pathname, link.href) && link.href !== "/" ? "page" : undefined}
                  className="flex min-h-16 items-center font-display text-5xl uppercase leading-none tracking-tight text-bone aria-[current=page]:text-laurel"
                >
                  {link.label}
                </Link>
              </m.li>
            ))}
            <li className="border-b border-rule">
              <AuthNav className="flex min-h-16 items-center font-display text-5xl uppercase leading-none tracking-tight text-bone aria-[current=page]:text-laurel" />
            </li>
          </ul>
          <p className="mt-10 font-mono text-xs uppercase tracking-widest text-bone-muted">
            dressed up, filtered out.
          </p>
        </nav>
      </Sheet>
    </>
  );
}
