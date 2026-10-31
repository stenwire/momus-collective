"use client";

import { Pause, Play } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { IconButton } from "./icon-button";

// Motion over 5s needs a pause control (WCAG 2.2.2); it also pauses on
// hover and focus, and stands still under reduced motion.
export function Marquee({
  items,
  label,
  className,
}: {
  items: string[];
  label: string;
  className?: string;
}) {
  const [paused, setPaused] = useState(false);
  if (items.length === 0) return null;

  const run = (copy: number) => (
    <ul
      aria-hidden={copy > 0 || undefined}
      className="flex shrink-0 items-center gap-8 pr-8"
    >
      {items.map((item, i) => (
        <li key={i} className="flex items-center gap-8 whitespace-nowrap">
          <span>{item}</span>
          <span aria-hidden="true" className="text-laurel">
            ✦
          </span>
        </li>
      ))}
    </ul>
  );

  return (
    <section
      aria-label={label}
      className={cn("group flex items-center border-y border-rule", className)}
    >
      <div className="min-w-0 flex-1 overflow-hidden">
        <div
          data-testid="marquee-track"
          data-paused={paused}
          className={cn(
            "flex w-max animate-marquee group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused] motion-reduce:animate-none",
            paused && "[animation-play-state:paused]",
          )}
        >
          {run(0)}
          {run(1)}
        </div>
      </div>
      <IconButton
        label={paused ? "Play slogans" : "Pause slogans"}
        aria-pressed={paused}
        onClick={() => setPaused((p) => !p)}
        className="border-l border-rule motion-reduce:hidden"
      >
        {paused ? (
          <Play className="size-4" aria-hidden="true" />
        ) : (
          <Pause className="size-4" aria-hidden="true" />
        )}
      </IconButton>
    </section>
  );
}
