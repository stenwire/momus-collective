import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Log in | momus collective",
  robots: { index: false },
};

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6 px-4 py-10">
      <h1 className="text-2xl font-semibold text-bone">Log in</h1>
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
