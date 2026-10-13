import { LoaderCircle } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "relative inline-flex min-h-11 select-none items-center justify-center gap-2 font-semibold uppercase tracking-wider transition-[background-color,border-color,color,box-shadow,transform] duration-150 motion-reduce:transition-none disabled:pointer-events-none disabled:opacity-50";

// The hard laurel shadow collapses as the button presses into the page.
const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-laurel text-ink shadow-press hover:bg-laurel-hi active:translate-x-1 active:translate-y-1 active:shadow-none",
  secondary:
    "border border-bone-muted text-bone hover:border-bone hover:bg-bone/5 active:translate-y-px",
  ghost: "text-bone-muted underline-offset-4 hover:text-bone hover:underline",
  danger: "border border-error text-error hover:bg-error/10 active:translate-y-px",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "px-4 text-xs",
  md: "px-6 text-sm",
  lg: "min-h-14 px-8 text-base",
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  block = false,
}: { variant?: ButtonVariant; size?: ButtonSize; block?: boolean } = {}) {
  return cn(BASE, VARIANTS[variant], SIZES[size], block && "w-full");
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  loading?: boolean;
};

export function Button({
  variant,
  size,
  block,
  loading = false,
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonClasses({ variant, size, block }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && (
        <span className="absolute inset-0 grid place-items-center" aria-hidden="true">
          <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" />
        </span>
      )}
      {/* opacity, not visibility: the label stays the accessible name. */}
      <span className={cn("inline-flex items-center gap-2", loading && "opacity-0")}>
        {children}
      </span>
    </button>
  );
}
