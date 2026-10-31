import { NewsletterForm } from "./newsletter-form";
import { Reveal } from "./ui/reveal";

export function NewDrops() {
  return (
    <section aria-labelledby="new-drops" className="mx-auto w-full max-w-6xl px-4 py-16">
      <Reveal className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-3">
          <p className="font-mono text-xs uppercase tracking-widest text-laurel">Every week</p>
          <h2
            id="new-drops"
            className="font-display text-[clamp(2.5rem,8vw,5rem)] uppercase leading-[0.9] tracking-tight"
          >
            New drops, weekly.
          </h2>
          <p className="max-w-prose text-bone-muted">
            Fresh slogans every week, straight to your inbox. No spam; unsubscribe in one click.
          </p>
        </div>
        <NewsletterForm />
      </Reveal>
    </section>
  );
}
