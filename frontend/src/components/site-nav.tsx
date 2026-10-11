import Image from "next/image";
import Link from "next/link";

export function SiteNav() {
  return (
    <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
      <Link href="/" className="flex items-center">
        <Image
          src="/wordmark.png"
          alt="momus collective"
          width={140}
          height={41}
          priority
          className="h-auto w-[110px] md:w-[140px]"
        />
      </Link>
      <Link
        href="/shop"
        className="text-sm font-medium text-zinc-300 hover:text-zinc-50"
      >
        Shop
      </Link>
    </header>
  );
}
