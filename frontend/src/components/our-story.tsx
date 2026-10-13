import Image from "next/image";
import { Reveal } from "./ui/reveal";

export function OurStory() {
  return (
    <section
      aria-labelledby="our-story"
      className="mx-auto grid w-full max-w-6xl gap-10 border-b border-rule px-4 py-16 md:grid-cols-[auto_1fr] md:items-center md:gap-16"
    >
      <Reveal>
        {/* A marble tablet: multiply turns the artwork's white ground into
            bone, so the illustration sits on the page instead of a white box. */}
        <figure className="marble relative mx-auto aspect-[825/1536] w-56 bg-bone shadow-press md:w-72">
          <Image
            src="/mascot-human.png"
            alt="Momus, depicted as a young man in a Greek toga, wearing a comedy theater mask at his belt"
            fill
            sizes="(min-width: 768px) 288px, 224px"
            className="object-contain mix-blend-multiply"
          />
        </figure>
      </Reveal>
      <div className="flex flex-col gap-6">
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-widest text-laurel">Our story</p>
          <h2
            id="our-story"
            className="mt-3 font-display text-[clamp(2.5rem,8vw,5rem)] uppercase leading-[0.9] tracking-tight"
          >
            Exiled for telling the truth.
          </h2>
        </Reveal>
        <Reveal index={1}>
          <p className="max-w-prose text-lg text-bone-muted">
            Momus was the Greek god of satire, mockery and fair criticism — the one who pointed out
            the flaws the other gods couldn&apos;t see. He was so relentlessly, hilariously honest
            about Zeus and Aphrodite alike that Olympus eventually cast him out. We think he&apos;d
            have approved of a t-shirt that says the quiet part out loud.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
