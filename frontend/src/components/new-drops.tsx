import { NewsletterForm } from "./newsletter-form";

export function NewDrops() {
  return (
    <section aria-labelledby="new-drops" className="flex flex-col items-center gap-4 px-4 py-12 text-center">
      <h2 id="new-drops" className="text-2xl font-semibold text-zinc-50">
        New drops, weekly
      </h2>
      <p className="max-w-prose text-zinc-400">
        Fresh slogans every week, straight to your inbox. No spam; unsubscribe in one click.
      </p>
      <NewsletterForm />
    </section>
  );
}
