import {
  Abril_Fatface,
  Anton,
  Archivo_Black,
  Bebas_Neue,
  DM_Serif_Display,
  Pacifico,
  Permanent_Marker,
  Space_Mono,
  Stardos_Stencil,
} from "next/font/google";

// Same families and weights as backend/designs/fonts; keyed by the
// backend's font keys, which are the source of truth (D-066).
const archivoBlack = Archivo_Black({ weight: "400", subsets: ["latin"] });
const anton = Anton({ weight: "400", subsets: ["latin"] });
const bebasNeue = Bebas_Neue({ weight: "400", subsets: ["latin"] });
const permanentMarker = Permanent_Marker({ weight: "400", subsets: ["latin"] });
const pacifico = Pacifico({ weight: "400", subsets: ["latin"] });
const spaceMono = Space_Mono({ weight: "700", subsets: ["latin"] });
const dmSerifDisplay = DM_Serif_Display({ weight: "400", subsets: ["latin"] });
const abrilFatface = Abril_Fatface({ weight: "400", subsets: ["latin"] });
const stardosStencil = Stardos_Stencil({ weight: "700", subsets: ["latin"] });

const FAMILIES: Record<string, { family: string; weight: number }> = {
  archivo_black: { family: archivoBlack.style.fontFamily, weight: 400 },
  anton: { family: anton.style.fontFamily, weight: 400 },
  bebas_neue: { family: bebasNeue.style.fontFamily, weight: 400 },
  permanent_marker: { family: permanentMarker.style.fontFamily, weight: 400 },
  pacifico: { family: pacifico.style.fontFamily, weight: 400 },
  space_mono: { family: spaceMono.style.fontFamily, weight: 700 },
  dm_serif_display: { family: dmSerifDisplay.style.fontFamily, weight: 400 },
  abril_fatface: { family: abrilFatface.style.fontFamily, weight: 400 },
  stardos_stencil: { family: stardosStencil.style.fontFamily, weight: 700 },
};

const FALLBACK = { family: "sans-serif", weight: 700 };

export function fontFor(key: string) {
  return FAMILIES[key] ?? FALLBACK;
}

export function canvasFont(key: string, px: number): string {
  const { family, weight } = fontFor(key);
  return `${weight} ${px}px ${family}`;
}
