"use client";

import { useState } from "react";
import { unsubscribeFromNewsletter } from "@/lib/newsletter";

export function UnsubscribeButton({ token }: { token: string }) {
  const [state, setState] = useState<{ done: boolean; message: string; error: boolean }>({
    done: false,
    message: "",
    error: false,
  });
  if (state.done) {
    return (
      <p role="status" className="text-emerald-400">
        {state.message} You won&apos;t get new-drop emails any more.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="text-zinc-300">Stop receiving the weekly new-drops email?</p>
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
        className="min-h-11 self-start rounded-md bg-amber-400 px-4 text-sm font-medium text-black hover:bg-amber-300"
      >
        Unsubscribe
      </button>
      {state.error ? (
        <p role="alert" className="text-sm text-red-400">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
