"use client";

import { useId, useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import { inputClasses } from "@/components/ui/input";
import { subscribeToNewsletter } from "@/lib/newsletter";
import { toast } from "@/lib/toast";

export function ComingSoonSignup() {
  const id = useId();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="flex w-full max-w-md flex-col gap-2"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError(false);
        try {
          await subscribeToNewsletter(email.trim());
          setMessage("You’re subscribed to new-drop announcements.");
          setEmail("");
          toast("You're subscribed to new-drop announcements.", { tone: "success", label: "Subscribed" });
        } catch (reason) {
          setError(true);
          setMessage((reason as Error).message);
          toast((reason as Error).message, { tone: "error" });
        } finally {
          setPending(false);
        }
      }}
    >
      <label htmlFor={id} className="text-sm font-medium">Email address</label>
      <div className="flex flex-wrap gap-2 sm:flex-nowrap">
        <input id={id} type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com…" className={`${inputClasses} min-w-0 flex-1`} />
        <button type="submit" disabled={pending} className={buttonClasses({ size: "sm" })}>
          {pending ? "Joining…" : "Get updates"}
        </button>
      </div>
      <p role={error ? "alert" : "status"} className={`min-h-5 text-sm ${error ? "text-error" : "text-ok"}`}>{message}</p>
    </form>
  );
}