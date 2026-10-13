import { Fragment, type CSSProperties, type ElementType } from "react";
import { cn } from "@/lib/cn";

// Words rise in on a CSS animation, so the headline animates before
// hydration and needs no JS. Assistive tech reads the plain string.
export function KineticText({
  text,
  as: Tag = "span",
  className,
  delayMs = 0,
  stepMs = 70,
}: {
  text: string;
  as?: ElementType;
  className?: string;
  delayMs?: number;
  stepMs?: number;
}) {
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <Tag className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((word, i) => (
          // The space sits between the masks: inside an inline-block it would
          // be trimmed, and out here it is also where long lines can wrap.
          <Fragment key={i}>
            <span className="-mb-[0.15em] inline-block overflow-hidden pb-[0.15em] align-bottom">
              <span
                className={cn("inline-block animate-rise")}
                style={{ animationDelay: `${delayMs + i * stepMs}ms` } as CSSProperties}
              >
                {word}
              </span>
            </span>
            {i < words.length - 1 ? " " : null}
          </Fragment>
        ))}
      </span>
    </Tag>
  );
}
