import Image from "next/image";

export function OurStory() {
  return (
    <section className="flex flex-col items-center gap-6 px-4 py-12 md:flex-row md:gap-10">
      <div className="relative h-80 w-56 flex-shrink-0 md:h-[28rem] md:w-80">
        <Image
          src="/mascot-human.png"
          alt="Momus, depicted as a young man in a Greek toga, wearing a comedy theater mask at his belt"
          fill
          sizes="(max-width: 768px) 224px, 320px"
          className="object-contain"
        />
      </div>
      <div className="flex flex-col gap-4 text-center md:text-left">
        <h2 className="text-2xl font-semibold text-zinc-50">Our Story</h2>
        <p className="max-w-prose text-zinc-400">
          Momus was the Greek god of satire, mockery and fair criticism — the
          one who pointed out the flaws the other gods couldn&apos;t see. He
          was so relentlessly, hilariously honest about Zeus and Aphrodite
          alike that Olympus eventually cast him out. We think he&apos;d have
          approved of a t-shirt that says the quiet part out loud.
        </p>
      </div>
    </section>
  );
}
