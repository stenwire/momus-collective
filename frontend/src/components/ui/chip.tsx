import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  selected: boolean;
  shape?: "square" | "pill";
  // false: the caller draws the selected background (a sliding indicator).
  // Wrapping is the caller's call too: cn() cannot override a base class.
  fill?: boolean;
};

export function Chip({
  selected,
  shape = "square",
  fill = true,
  className,
  children,
  type = "button",
  ...rest
}: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        "relative inline-flex min-h-11 min-w-11 items-center justify-center border px-3 text-sm transition-[background-color,border-color,color] duration-150 motion-reduce:transition-none",
        shape === "pill" && "rounded-full",
        selected
          ? cn("border-laurel font-semibold text-ink", fill && "bg-laurel")
          : "border-rule text-bone hover:border-bone-muted",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
