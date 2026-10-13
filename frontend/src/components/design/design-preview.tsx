"use client";

import { useEffect, useRef } from "react";
import { buttonClasses } from "@/components/ui/button";
import type { DesignConfig, DesignOptions } from "@/lib/design/types";
import { ShirtCanvas } from "./shirt-canvas";

export function DesignPreview({
  config,
  options,
  onClose,
}: {
  config: DesignConfig;
  options: DesignOptions;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Design preview"
      className="marble fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-ink p-4"
    >
      <div className="w-full max-w-xl">
        <ShirtCanvas
          config={config}
          options={options}
          label={`Finished shirt preview: ${config.text || "no text"}`}
        />
      </div>
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        className={buttonClasses({ variant: "secondary" })}
      >
        Back to editing
      </button>
    </div>
  );
}
