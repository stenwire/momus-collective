import Link from "next/link";
import { HapticsToggle } from "./haptics-toggle";
import { NewsletterForm } from "./newsletter-form";
import { NAV_LINKS } from "./site-nav-links";

export function SiteFooter() {
  return (
    <footer className="marble mt-auto border-t border-rule bg-ink">
      <div className="border-b border-rule px-4 py-10 md:py-14">
        <p className="font-display text-[clamp(2.75rem,11vw,8rem)] uppercase leading-[0.9] tracking-tight text-bone">
          dressed up,
          <br />
          <span className="text-laurel">filtered out.</span>
        </p>
      </div>
      <div className="grid gap-8 px-4 py-8 md:grid-cols-[2fr_1fr_1fr] md:items-start">
        <NewsletterForm />
        <nav aria-label="Footer">
          <ul className="flex flex-col">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-flex min-h-11 items-center font-mono text-xs uppercase tracking-widest text-bone-muted hover:text-bone"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex flex-col gap-2 md:items-end">
          <HapticsToggle />
          <p className="font-mono text-xs uppercase tracking-widest text-bone-muted">
            © momus collective. Made in Lagos.
          </p>
        </div>
      </div>
    </footer>
  );
}
