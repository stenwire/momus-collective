import type { ReactNode } from "react";

export type PolicySection = { title: string; content: ReactNode };

export function PolicyPage({
  title,
  summary,
  sections,
}: {
  title: string;
  summary: string;
  sections: PolicySection[];
}) {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-10 sm:py-14">
      <header className="flex flex-col gap-3 border-b border-rule pb-6">
        <h1 className="font-display text-4xl uppercase leading-none sm:text-5xl">{title}</h1>
        <p className="max-w-2xl text-bone-muted">{summary}</p>
      </header>
      <div className="flex flex-col gap-8">
        {sections.map((section) => (
          <section key={section.title} className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">{section.title}</h2>
            <div className="max-w-3xl space-y-3 leading-relaxed text-bone-muted">{section.content}</div>
          </section>
        ))}
      </div>
    </main>
  );
}