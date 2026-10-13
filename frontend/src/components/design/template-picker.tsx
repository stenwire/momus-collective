"use client";

import { fontFor } from "@/lib/design/fonts";
import { labelClasses } from "@/components/ui/input";
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
      <h2 id="design-templates" className={labelClasses}>
        Start from a template
      </h2>
      {options.template_styles.map((style) => (
        <div key={style.key} role="group" aria-label={style.label}>
          <h3 className="mb-2 font-mono text-xs uppercase tracking-widest text-bone-muted/80">
            {style.label}
          </h3>
          <div className="flex snap-x gap-2 overflow-x-auto overscroll-x-contain pb-1">
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
                    className="min-h-11 shrink-0 snap-start border border-rule bg-ink px-3 py-2 text-left text-sm leading-tight whitespace-pre-line text-bone transition-[border-color,transform] duration-150 hover:border-laurel active:translate-y-px motion-reduce:transition-none"
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
