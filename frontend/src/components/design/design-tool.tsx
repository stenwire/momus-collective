"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { fetchDesignOptions, fetchDesignPricing } from "@/lib/api";
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
      <p className="px-4 text-zinc-400">
        The design tool could not load. Refresh to try again.
      </p>
    );
  }
  if (!options || !config) {
    return <p className="px-4 text-zinc-400">Loading the design tool…</p>;
  }

  const price = pricing?.prices[config.shirt_color];

  if (previewing) {
    return (
      <DesignPreview config={config} options={options} onClose={closePreview} />
    );
  }

  return (
    <div className="flex flex-col gap-6 px-4 pb-10 md:flex-row md:items-start">
      <div className="w-full md:sticky md:top-4 md:max-w-xl md:flex-1">
        <ShirtCanvas
          config={config}
          options={options}
          label={`Shirt mockup: ${config.text || "no text yet"}`}
          guide
        />
        <button
          type="button"
          onClick={() => setPreviewing(true)}
          className="mt-3 min-h-11 w-full rounded-md border border-zinc-600 px-4 text-sm font-medium text-zinc-100 hover:border-zinc-400"
        >
          Preview
        </button>
        <p className="mt-4 text-lg font-semibold text-amber-400">
          {price === undefined ? "\u00a0" : formatNaira(price)}
          <span className="ml-2 text-sm font-normal text-zinc-400">
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
