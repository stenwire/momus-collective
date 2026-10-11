"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { fetchDesignOptions } from "@/lib/api";
import { allowedTextColors, withShirtColor } from "@/lib/design/config";
import { useDesignStore } from "@/lib/design/store";
import { DesignPreview } from "./design-preview";
import { FontPicker } from "./font-picker";
import { OptionButtons } from "./option-buttons";
import { SaveDesign } from "./save-design";
import { ShirtCanvas } from "./shirt-canvas";
import { SloganInput } from "./slogan-input";
import { SwatchPicker } from "./swatch-picker";
import { TemplatePicker } from "./template-picker";

export function DesignTool() {
  const { data: options, isError } = useQuery({
    queryKey: ["design-options"],
    queryFn: fetchDesignOptions,
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
        <div className="mt-4">
          <SaveDesign config={config} />
        </div>
      </div>
      <div className="flex w-full flex-col gap-5 md:w-80">
        <TemplatePicker
          options={options}
          onPick={(template) => update(template.config)}
        />
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
        <OptionButtons
          legend="Text size"
          options={options.font_sizes}
          value={config.font_size}
          onChange={(font_size) => update({ font_size })}
        />
        <SwatchPicker
          legend="Shirt color"
          colors={options.shirt_colors}
          value={config.shirt_color}
          onChange={(shirt) => update(withShirtColor(config, shirt, options))}
        />
        <SwatchPicker
          legend="Text color"
          colors={allowedTextColors(options, config.shirt_color)}
          value={config.text_color}
          onChange={(text_color) => update({ text_color })}
        />
        <OptionButtons
          legend="Placement"
          options={options.placements}
          value={config.placement}
          onChange={(placement) => update({ placement })}
        />
        <OptionButtons
          legend="Alignment"
          options={options.alignments}
          value={config.alignment}
          onChange={(alignment) => update({ alignment })}
        />
        <OptionButtons
          legend="Letter spacing"
          options={options.letter_spacings}
          value={config.letter_spacing}
          onChange={(letter_spacing) => update({ letter_spacing })}
        />
      </div>
    </div>
  );
}
