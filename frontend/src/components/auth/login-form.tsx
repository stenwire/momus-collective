"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { errorMessages, login, safeNext } from "@/lib/auth/api";
import { FormErrors, FormField } from "./form-field";
import { buttonClasses } from "@/components/ui/button";
import { toast } from "@/lib/toast";

export function LoginForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setErrors([]);
    try {
      await login(
        String(form.get("email")),
        String(form.get("password")),
        form.get("remember") === "on",
      );
      toast("Welcome back.", { tone: "success", label: "Signed in" });
      router.push(next);
    } catch (error) {
      setErrors(errorMessages(error));
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <FormErrors messages={errors} />
      <FormField label="Email" name="email" type="email" autoComplete="email" required />
      <FormField
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      <label className="flex min-h-11 items-center gap-3 text-sm text-bone-muted">
        <input type="checkbox" name="remember" defaultChecked className="size-5" />
        Remember me for 30 days
      </label>
      <button
        type="submit"
        disabled={pending}
        className={buttonClasses()}
      >
        {pending ? "Logging in…" : "Log in"}
      </button>
      <p className="flex flex-wrap items-center gap-x-1 text-sm text-bone-muted">
        New here?{" "}
        <Link
          href={`/register?next=${encodeURIComponent(next)}`}
          className="inline-flex min-h-11 min-w-11 items-center justify-center text-laurel underline"
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}
