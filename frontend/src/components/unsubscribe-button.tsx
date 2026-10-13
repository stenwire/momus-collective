"use client";

import { useState } from "react";
import { unsubscribeFromNewsletter } from "@/lib/newsletter";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function UnsubscribeButton({ token }: { token: string }) {
  const [state, setState] = useState<{ done: boolean; message: string; error: boolean }>({
    done: false,
    message: "",
    error: false,
  });
  if (state.done) {
    return (
      <p role="status" className="text-ok">
        {state.message} You won&apos;t get new-drop emails any more.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="text-bone-muted">Stop receiving the weekly new-drops email?</p>
      <button
        type="button"
        onClick={async () => {
          try {
            const message = await unsubscribeFromNewsletter(token);
            setState({ done: true, message, error: false });
          } catch (error) {
            setState({ done: false, message: (error as Error).message, error: true });
          }
        }}
        className={cn(buttonClasses({ size: "sm" }), "self-start")}
      >
        Unsubscribe
      </button>
      {state.error ? (
        <p role="alert" className="text-sm text-error">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
