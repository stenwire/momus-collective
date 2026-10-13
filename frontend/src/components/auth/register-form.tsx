"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { errorMessages, register, safeNext } from "@/lib/auth/api";
import { FormErrors, FormField } from "./form-field";
import { buttonClasses } from "@/components/ui/button";

export function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  // Pre-filled from a guest checkout's account offer (FR-CART-05).
  const prefill = (key: string) => params.get(key) ?? undefined;
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setErrors([]);
    try {
      await register({
        email: String(form.get("email")),
        password: String(form.get("password")),
        first_name: String(form.get("first_name")),
        last_name: String(form.get("last_name")),
        phone: String(form.get("phone")),
      });
      router.push(next);
    } catch (error) {
      setErrors(errorMessages(error));
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <FormErrors messages={errors} />
      <FormField label="First name" name="first_name" defaultValue={prefill("first_name")} autoComplete="given-name" required />
      <FormField label="Last name" name="last_name" defaultValue={prefill("last_name")} autoComplete="family-name" />
      <FormField label="Email" name="email" defaultValue={prefill("email")} type="email" autoComplete="email" required />
      <FormField label="Phone" name="phone" defaultValue={prefill("phone")} type="tel" autoComplete="tel" required />
      <FormField
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
      />
      <button
        type="submit"
        disabled={pending}
        className={buttonClasses()}
      >
        {pending ? "Creating account…" : "Create account"}
      </button>
      <p className="flex flex-wrap items-center gap-x-1 text-sm text-bone-muted">
        Already have an account?{" "}
        <Link
          href={`/login?next=${encodeURIComponent(next)}`}
          className="inline-flex min-h-11 min-w-11 items-center justify-center text-laurel underline"
        >
          Log in
        </Link>
      </p>
    </form>
  );
}
