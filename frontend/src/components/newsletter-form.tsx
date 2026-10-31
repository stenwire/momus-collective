"use client";

import { useId, useState } from "react";
import { subscribeToNewsletter } from "@/lib/newsletter";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { inputClasses, labelClasses } from "@/components/ui/input";
import { toast } from "@/lib/toast";

// FR-NOT-04: new drops by email, from the footer and the homepage.
export function NewsletterForm() {
  const id = useId();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<{ kind: "idle" | "busy" | "done" | "error"; message: string }>({
    kind: "idle",
    message: "",
  });
  return (
    <form
      className="flex w-full max-w-md flex-col gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setState({ kind: "busy", message: "" });
        try {
          await subscribeToNewsletter(email.trim());
          setState({ kind: "done", message: "You're on the list. New drops land in your inbox every week." });
          setEmail("");
          toast("You're on the list.", { tone: "success", label: "Subscribed" });
        } catch (error) {
          setState({ kind: "error", message: (error as Error).message });
          toast((error as Error).message, { tone: "error" });
        }
      }}
    >
      <label htmlFor={id} className={labelClasses}>
        Get new drops by email
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com…"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={cn(inputClasses, "flex-1")}
        />
        <button
          type="submit"
          disabled={state.kind === "busy"}
          className={cn(buttonClasses({ size: "sm" }), "shrink-0")}
        >
          Subscribe
        </button>
      </div>
      <p
        role={state.kind === "error" ? "alert" : "status"}
        className={cn("text-sm", state.kind === "error" ? "text-error" : "text-ok")}
      >
        {state.message}
      </p>
    </form>
  );
}
