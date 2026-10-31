import type { Metadata } from "next";
import { Suspense } from "react";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Create an account | momus collective",
  robots: { index: false },
};

export default function RegisterPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6 px-4 py-10">
      <h1 className="text-2xl font-semibold text-bone">Create an account</h1>
      <Suspense>
        <RegisterForm />
      </Suspense>
    </main>
  );
}
