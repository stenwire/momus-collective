import { Anton, Epilogue, Space_Mono } from "next/font/google";

// Anton and Space Mono double as design-tool fonts (lib/design/fonts.ts),
// so the storefront and the tool share one copy of each.
export const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
});

export const epilogue = Epilogue({
  subsets: ["latin"],
  variable: "--font-epilogue",
});

export const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-space-mono",
});

export const fontVariables = [anton, epilogue, spaceMono]
  .map((font) => font.variable)
  .join(" ");
