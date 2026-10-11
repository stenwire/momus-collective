"use client";

import { fontFor } from "@/lib/design/fonts";
import type { DesignOptions, DesignTemplate } from "@/lib/design/types";

export function TemplatePicker({
  options,
  onPick,
}: {
  options: DesignOptions;
  onPick: (template: DesignTemplate) => void;
}) {
  return (
    <section aria-labelledby="design-templates" className="flex flex-col gap-3">
      <h2 id="design-templates" className="text-sm font-medium text-zinc-300">
        Start from a template
      </h2>
      {options.template_styles.map((style) => (
        <div key={style.key} role="group" aria-label={style.label}>
          <h3 className="mb-2 text-xs uppercase tracking-wide text-zinc-400">
            {style.label}
          </h3>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {options.templates
              .filter((t) => t.style === style.key)
              .map((template) => {
                const { family, weight } = fontFor(template.config.font);
                return (
                  <button
                    key={template.key}
                    type="button"
                    onClick={() => onPick(template)}
                    aria-label={`Use template: ${template.name}`}
                    style={{ fontFamily: family, fontWeight: weight }}
                    className="min-h-11 shrink-0 rounded-md border border-zinc-700 px-3 py-2 text-left text-sm leading-tight whitespace-pre-line text-zinc-100 hover:border-zinc-500"
                  >
                    {template.config.text}
                  </button>
                );
              })}
          </div>
        </div>
      ))}
    </section>
  );
}
