import Link from "next/link";
import { ArrowUpRight, Camera, Play, Users } from "lucide-react";
import { HapticsToggle } from "./haptics-toggle";
import { NewsletterForm } from "./newsletter-form";
import { ThemeToggle } from "./theme-toggle";

const GROUPS = [
  {
    title: "Products",
    links: [
      { href: "/shop", label: "Shop all" },
      { href: "/design", label: "Design a shirt" },
      { href: "/shop", label: "New drops" },
    ],
  },
  {
    title: "Beyond shirts",
    links: [
      { href: "/coming-soon/art-prints", label: "Art prints" },
      { href: "/coming-soon/tote-bags", label: "Tote bags" },
      { href: "/coming-soon/hoodies", label: "Hoodies" },
      { href: "/coming-soon/stickers", label: "Stickers" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "/shipping", label: "Shipping and delivery" },
      { href: "/returns", label: "Returns" },
      { href: "/complaints", label: "File a complaint" },
    ],
  },
  {
    title: "Company info",
    links: [
      { href: "/#our-story", label: "Our story" },
      { href: "/privacy", label: "Privacy policy" },
    ],
  },
];

const SOCIALS = [
  { label: "Instagram", href: process.env.NEXT_PUBLIC_INSTAGRAM_URL, icon: Camera },
  { label: "Facebook", href: process.env.NEXT_PUBLIC_FACEBOOK_URL, icon: Users },
  { label: "YouTube", href: process.env.NEXT_PUBLIC_YOUTUBE_URL, icon: Play },
];

export function SiteFooter() {
  return (
    <footer className="marble mt-auto border-t border-rule bg-ink">
      <div className="grid gap-10 border-b border-rule px-4 py-8 md:grid-cols-[1.1fr_2fr] md:px-8 md:py-10">
        <div className="flex flex-col justify-between gap-8">
          <p className="max-w-sm font-display text-4xl uppercase leading-[0.9] text-bone sm:text-5xl">
            dressed up,<br /><span className="text-laurel">filtered out.</span>
          </p>
          <NewsletterForm />
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
          {GROUPS.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <h2 className="mb-3 font-semibold text-bone">{group.title}</h2>
              <ul className="flex flex-col">
                {group.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link href={link.href} className="inline-flex min-h-10 items-center text-sm text-bone-muted hover:text-bone">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
          <section aria-labelledby="follow-us">
            <h2 id="follow-us" className="mb-3 font-semibold text-bone">Follow us</h2>
            <ul className="flex flex-col gap-1">
              {SOCIALS.map(({ label, href, icon: Icon }) => (
                <li key={label}>
                  {href ? (
                    <a href={href} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 text-sm text-bone-muted hover:text-bone">
                      <Icon className="size-5" aria-hidden="true" /> {label}<ArrowUpRight className="size-3" aria-hidden="true" />
                    </a>
                  ) : (
                    <span className="inline-flex min-h-10 items-center gap-2 text-sm text-bone-muted" aria-label={`${label}, coming soon`}>
                      <Icon className="size-5" aria-hidden="true" /> {label}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
      <div className="flex flex-col gap-5 px-4 py-5 sm:flex-row sm:items-center sm:justify-between md:px-8">
        <p className="text-xs text-bone-muted">© {new Date().getFullYear()} momus collective. Made in Lagos.</p>
        <div className="flex flex-wrap items-center gap-2">
          <ThemeToggle />
          <HapticsToggle />
        </div>
      </div>
    </footer>
  );
}
