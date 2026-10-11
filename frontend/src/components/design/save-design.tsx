"use client";

import Link from "next/link";
import { useState } from "react";
import { ApiError, errorMessages } from "@/lib/auth/api";
import { useSignedIn } from "@/lib/auth/use-signed-in";
import { defaultDesignName, saveDesign } from "@/lib/design/saved";
import { useDesignStore } from "@/lib/design/store";
import type { DesignConfig } from "@/lib/design/types";
import { FormErrors } from "../auth/form-field";

const BUTTON =
  "min-h-11 rounded-md bg-amber-400 px-6 font-medium text-black hover:bg-amber-300 disabled:opacity-60";

export function SaveDesign({ config }: { config: DesignConfig }) {
  const signedIn = useSignedIn();
  const { savedId, name, setName, markSaved } = useDesignStore();
  const [prompting, setPrompting] = useState(false);
  const [status, setStatus] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, setPending] = useState(false);

  if (signedIn === null) return null;

  if (!signedIn) {
    return prompting ? (
      <div
        role="region"
        aria-label="Save your design"
        className="flex flex-col gap-3 rounded-lg border border-zinc-700 p-4"
      >
        <p className="text-sm text-zinc-300">
          Create a free account to save this design. It&apos;ll be waiting for
          you right here.
        </p>
        <Link href="/register?next=/design" className={`${BUTTON} flex items-center justify-center`}>
          Create an account
        </Link>
        <Link
          href="/login?next=/design"
          className="flex min-h-11 items-center justify-center text-sm text-amber-400 underline"
        >
          I already have one
        </Link>
      </div>
    ) : (
      <button type="button" onClick={() => setPrompting(true)} className={BUTTON}>
        Save design
      </button>
    );
  }

  const displayName = name || defaultDesignName(config.text);

  async function onSave() {
    setPending(true);
    setErrors([]);
    setStatus("");
    try {
      const saved = await saveDesign(savedId, displayName, config);
      markSaved(saved.id, saved.name);
      setStatus(savedId ? "Changes saved." : "Saved to your designs.");
    } catch (error) {
      // Deleted elsewhere: the next save creates it afresh.
      if (error instanceof ApiError && error.status === 404) {
        useDesignStore.setState({ savedId: null });
      }
      setErrors(errorMessages(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm font-medium text-zinc-300">
        Design name
        <input
          value={displayName}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          className="min-h-11 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-base text-zinc-50 focus:border-amber-400 focus:outline-none"
        />
      </label>
      <FormErrors messages={errors} />
      <button type="button" onClick={onSave} disabled={pending} className={BUTTON}>
        {pending ? "Saving…" : savedId ? "Save changes" : "Save design"}
      </button>
      <p aria-live="polite" className="text-sm text-emerald-400">
        {status}
      </p>
    </div>
  );
}
