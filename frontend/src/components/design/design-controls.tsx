"use client";

import { allowedTextColors, withShirtColor } from "@/lib/design/config";
import type { DesignConfig, DesignOptions } from "@/lib/design/types";
import { FontPicker } from "./font-picker";
import { OptionButtons } from "./option-buttons";
import { SloganInput } from "./slogan-input";
import { SwatchPicker } from "./swatch-picker";
import { TemplatePicker } from "./template-picker";

// Shared by the design tool and an order's design revision, where the shirt
// colour is fixed because it set the price.
export function DesignControls({
  config,
  options,
  update,
  lockShirtColor = false,
}: {
  config: DesignConfig;
  options: DesignOptions;
  update: (change: Partial<DesignConfig>) => void;
  lockShirtColor?: boolean;
}) {
  return (
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
      {lockShirtColor ? null : (
        <SwatchPicker
          legend="Shirt color"
          colors={options.shirt_colors}
          value={config.shirt_color}
          onChange={(shirt) => update(withShirtColor(config, shirt, options))}
        />
      )}
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
  );
}
