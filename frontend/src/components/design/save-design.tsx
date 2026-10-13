"use client";

import Link from "next/link";
import { useState } from "react";
import { ApiError, errorMessages } from "@/lib/auth/api";
import { useSignedIn } from "@/lib/auth/use-signed-in";
import { defaultDesignName, exportDesign, saveDesign } from "@/lib/design/saved";
import { sameConfig, useDesignStore } from "@/lib/design/store";
import type { DesignConfig } from "@/lib/design/types";
import { FormErrors } from "../auth/form-field";
import { buttonClasses } from "@/components/ui/button";
import { inputClasses, labelClasses } from "@/components/ui/input";
import { cn } from "@/lib/cn";

const BUTTON = buttonClasses();
const SECONDARY = buttonClasses({ variant: "secondary" });

export function SaveDesign({ config }: { config: DesignConfig }) {
  const signedIn = useSignedIn();
  const { savedId, savedConfig, name, setName, markSaved } = useDesignStore();
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
        className="flex flex-col gap-3 border border-rule bg-ink-raised p-4"
      >
        <p className="text-sm text-bone-muted">
          Create a free account to save this design. It&apos;ll be waiting for
          you right here.
        </p>
        <Link href="/register?next=/design" className={`${BUTTON} flex items-center justify-center`}>
          Create an account
        </Link>
        <Link
          href="/login?next=/design"
          className="flex min-h-11 items-center justify-center text-sm text-laurel underline underline-offset-4"
        >
          I already have one
        </Link>
      </div>
    ) : (
      <div className="flex flex-col gap-3">
        <button type="button" onClick={() => setPrompting(true)} className={BUTTON}>
          Save design
        </button>
        <button type="button" onClick={() => setPrompting(true)} className={SECONDARY}>
          Add to cart
        </button>
      </div>
    );
  }

  const displayName = name || defaultDesignName(config.text);

  async function run(task: () => Promise<string>) {
    setPending(true);
    setErrors([]);
    setStatus("");
    try {
      setStatus(await task());
    } catch (error) {
      // Deleted elsewhere: the next save creates it afresh.
      if (error instanceof ApiError && error.status === 404) {
        useDesignStore.setState({ savedId: null });
      }
      setStatus("");
      setErrors(errorMessages(error));
    } finally {
      setPending(false);
    }
  }

  async function save(): Promise<string> {
    const saved = await saveDesign(savedId, displayName, config);
    markSaved(saved.id, saved.name, saved.config);
    return saved.id;
  }

  const onSave = () =>
    run(async () => {
      const wasSaved = savedId;
      await save();
      return wasSaved ? "Changes saved." : "Saved to your designs.";
    });

  // FR-DES-09: adding to cart generates the print file. The cart line
  // itself is M4's (D-075).
  const onAddToCart = () =>
    run(async () => {
      const id =
        savedId && sameConfig(config, savedConfig) ? savedId : await save();
      setStatus("Preparing your print file…");
      await exportDesign(id);
      return "Print-ready file created at 300 DPI.";
    });

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className={labelClasses}>Design name</span>
        <input
          value={displayName}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          className={cn(inputClasses, "w-full")}
        />
      </label>
      <FormErrors messages={errors} />
      <button type="button" onClick={onSave} disabled={pending} className={BUTTON}>
        {pending ? "Working…" : savedId ? "Save changes" : "Save design"}
      </button>
      <button
        type="button"
        onClick={onAddToCart}
        disabled={pending}
        className={SECONDARY}
      >
        Add to cart
      </button>
      <p aria-live="polite" className="text-sm text-ok">
        {status}
      </p>
    </div>
  );
}
