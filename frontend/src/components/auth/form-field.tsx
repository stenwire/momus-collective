"use client";

import { useEffect, useRef } from "react";
import { inputClasses, labelClasses } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { haptic } from "@/lib/haptics";

export function FormField({
  label,
  ...input
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1">
      <span className={labelClasses}>{label}</span>
      <input {...input} className={cn(inputClasses, "w-full")} />
    </label>
  );
}

// Errors come back from the server as a summary, so focus moves to it (and
// the phone buzzes) whenever a submit fails.
export function FormErrors({ messages }: { messages: string[] }) {
  const ref = useRef<HTMLUListElement>(null);
  const key = messages.join("\n");
  useEffect(() => {
    if (!key) return;
    haptic("error");
    ref.current?.focus();
  }, [key]);
  if (messages.length === 0) return null;
  return (
    <ul
      ref={ref}
      role="alert"
      tabIndex={-1}
      className="flex flex-col gap-1 border-l-2 border-error pl-3 text-sm text-error"
    >
      {messages.map((m) => (
        <li key={m}>{m}</li>
      ))}
    </ul>
  );
}
