"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { fetchDesignOptions } from "@/lib/api";
import { useDesignStore } from "@/lib/design/store";
import { FontPicker } from "./font-picker";
import { ShirtCanvas } from "./shirt-canvas";
import { SloganInput } from "./slogan-input";
import { SwatchPicker } from "./swatch-picker";

export function DesignTool() {
  const { data: options, isError } = useQuery({
    queryKey: ["design-options"],
    queryFn: fetchDesignOptions,
  });
  const config = useDesignStore((s) => s.config);
  const initialize = useDesignStore((s) => s.initialize);
  const update = useDesignStore((s) => s.update);

  useEffect(() => {
    if (options && !config) initialize(options.defaults);
  }, [options, config, initialize]);

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

  return (
    <div className="flex flex-col gap-6 px-4 pb-10 md:flex-row md:items-start">
      <div className="w-full md:sticky md:top-4 md:max-w-xl md:flex-1">
        <ShirtCanvas
          config={config}
          options={options}
          label={`Shirt mockup: ${config.text || "no text yet"}`}
        />
      </div>
      <div className="flex w-full flex-col gap-5 md:w-80">
        <SloganInput
          value={config.text}
          limits={options.text_limits}
          onChange={(text) => update({ text })}
        />
        <FontPicker
          fonts={options.fonts}
          value={config.font}
          onChange={(font) => update({ font })}
        />
        <SwatchPicker
          legend="Shirt color"
          colors={options.shirt_colors}
          value={config.shirt_color}
          onChange={(shirt_color) => update({ shirt_color })}
        />
      </div>
    </div>
  );
}
