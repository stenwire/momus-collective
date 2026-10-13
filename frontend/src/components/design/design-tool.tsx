"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { fetchDesignOptions, fetchDesignPricing } from "@/lib/api";
import { buttonClasses } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import { formatNaira } from "@/lib/format";
import { useDesignStore } from "@/lib/design/store";
import { DesignPreview } from "./design-preview";
import { DesignControls } from "./design-controls";
import { SaveDesign } from "./save-design";
import { ShirtCanvas } from "./shirt-canvas";

export function DesignTool() {
  const { data: options, isError } = useQuery({
    queryKey: ["design-options"],
    queryFn: fetchDesignOptions,
  });
  const { data: pricing } = useQuery({
    queryKey: ["design-pricing"],
    queryFn: fetchDesignPricing,
  });
  const config = useDesignStore((s) => s.config);
  const initialize = useDesignStore((s) => s.initialize);
  const update = useDesignStore((s) => s.update);
  const [previewing, setPreviewing] = useState(false);
  const closePreview = useCallback(() => setPreviewing(false), []);

  useEffect(() => {
    if (options) initialize(options.defaults);
  }, [options, initialize]);

  if (isError) {
    return (
      <p role="alert" className="px-4 text-bone-muted">
        The design tool could not load. Refresh to try again.
      </p>
    );
  }
  if (!options || !config) {
    return (
      <div aria-busy="true" className="flex flex-col gap-6 px-4 pb-10 md:flex-row">
        <p role="status" className="sr-only">
          Loading the design tool…
        </p>
        <Skeleton className="aspect-square w-full md:max-w-xl md:flex-1" />
        <Skeleton className="h-96 w-full md:w-80" />
      </div>
    );
  }

  const price = pricing?.prices[config.shirt_color];

  if (previewing) {
    return (
      <DesignPreview config={config} options={options} onClose={closePreview} />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-10 md:flex-row md:items-start">
      <div className="w-full md:sticky md:top-20 md:max-w-xl md:flex-1">
        <ShirtCanvas
          config={config}
          options={options}
          label={`Shirt mockup: ${config.text || "no text yet"}`}
          guide
        />
        <button
          type="button"
          onClick={() => setPreviewing(true)}
          className={cn(buttonClasses({ variant: "secondary", block: true }), "mt-3")}
        >
          Preview
        </button>
        <p className="mt-4 font-mono text-xl font-bold tabular-nums text-laurel">
          {price === undefined ? "\u00a0" : formatNaira(price)}
          <span className="ml-2 font-sans text-sm font-normal text-bone-muted">
            on a {config.shirt_color} shirt
          </span>
        </p>
        <div className="mt-3">
          <SaveDesign config={config} />
        </div>
      </div>
      <DesignControls config={config} options={options} update={update} />
    </div>
  );
}
