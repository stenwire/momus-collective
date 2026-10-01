import Image from "next/image";
import Link from "next/link";

export function Hero() {
  return (
    <section className="flex flex-col items-center gap-6 px-4 py-12 md:flex-row md:justify-between md:py-20">
      <div className="order-2 flex flex-col items-center gap-4 text-center md:order-1 md:items-start md:text-left">
        <h1 className="text-3xl font-semibold text-zinc-50 md:text-5xl">
          Shirts with something to say.
        </h1>
        <p className="max-w-md text-zinc-400">
          Slogan t-shirts across philosophy, tech, dad jokes and more — or
          design your own.
        </p>
        <Link
          href="/shop"
          className="rounded-md bg-amber-400 px-6 py-2 font-medium text-black transition-colors hover:bg-amber-300"
        >
          Shop All Products
        </Link>
      </div>
      <div className="order-1 relative h-64 w-44 flex-shrink-0 md:order-2 md:h-96 md:w-64">
        <Image
          src="/mascot-raven.png"
          alt="A raven wearing a golden laurel, perched on a broken marble column"
          fill
          priority
          sizes="(max-width: 768px) 176px, 256px"
          className="object-contain"
        />
      </div>
    </section>
  );
}
