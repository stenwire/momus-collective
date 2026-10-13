import { HapticsToggle } from "./haptics-toggle";
import { NewsletterForm } from "./newsletter-form";

export function SiteFooter() {
  return (
    <footer className="mt-auto flex flex-col gap-6 border-t border-zinc-800 px-4 py-8 md:flex-row md:items-end md:justify-between">
      <NewsletterForm />
      <div className="flex flex-col gap-2 md:items-end">
        <HapticsToggle />
        <p className="text-xs text-zinc-500">© momus collective. Made in Lagos.</p>
      </div>
    </footer>
  );
}
