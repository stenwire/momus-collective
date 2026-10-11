import Image from "next/image";
import Link from "next/link";
import { AuthNav } from "./auth/auth-nav";
import { CartButton } from "./cart/cart-button";

export function SiteNav() {
  return (
    <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
      <Link href="/" className="flex min-h-11 items-center">
        <Image
          src="/wordmark.png"
          alt="momus collective"
          width={140}
          height={41}
          priority
          className="h-auto w-[110px] md:w-[140px]"
        />
      </Link>
      <nav className="flex items-center gap-3 sm:gap-4">
        <Link
          href="/shop"
          className="inline-flex min-h-11 min-w-11 items-center justify-center text-sm font-medium whitespace-nowrap text-zinc-300 hover:text-zinc-50"
        >
          Shop
        </Link>
        <Link
          href="/design"
          className="inline-flex min-h-11 min-w-11 items-center justify-center text-sm font-medium whitespace-nowrap text-zinc-300 hover:text-zinc-50"
        >
          Design
        </Link>
        <AuthNav />
        <CartButton />
      </nav>
    </header>
  );
}
