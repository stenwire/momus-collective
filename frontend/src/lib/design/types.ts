export type Box = { x: number; y: number; w: number; h: number };

export type NamedColor = { name: string; hex: string };

export type Placement = { key: string; label: string; box: Box };

export type DesignConfig = {
  shirt_color: string;
  text: string;
  text_color: string;
  placement: string;
};

export type TextLimits = { max_length: number; max_lines: number };

export type DesignOptions = {
  canvas_size: number;
  units_per_inch: number;
  print_dpi: number;
  text_limits: TextLimits;
  placements: Placement[];
  shirt_colors: NamedColor[];
  text_colors: NamedColor[];
  defaults: DesignConfig;
};
