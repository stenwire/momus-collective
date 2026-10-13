import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { cn } from "@/lib/cn";

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  label: string;
  children: ReactNode;
  tone?: "plain" | "solid";
  ref?: Ref<HTMLButtonElement>;
};

export function IconButton({
  label,
  children,
  tone = "plain",
  className,
  type = "button",
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      className={cn(
        "relative inline-grid size-11 shrink-0 place-items-center transition-[background-color,color,transform] duration-150 active:scale-90 motion-reduce:transition-none motion-reduce:active:scale-100 disabled:pointer-events-none disabled:opacity-50",
        tone === "solid"
          ? "bg-ink/70 text-bone hover:bg-ink"
          : "text-bone hover:bg-bone/10",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
