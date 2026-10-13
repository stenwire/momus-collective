import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  selected: boolean;
  shape?: "square" | "pill";
};

export function Chip({
  selected,
  shape = "square",
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
        "relative inline-flex min-h-11 min-w-11 items-center justify-center border px-3 text-sm whitespace-nowrap transition-[background-color,border-color,color] duration-150 motion-reduce:transition-none",
        shape === "pill" && "rounded-full",
        selected
          ? "border-laurel bg-laurel font-semibold text-ink"
          : "border-rule text-bone hover:border-bone-muted",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
