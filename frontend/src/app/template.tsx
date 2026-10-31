"use client";

import { useEffect, useState } from "react";

let appMounted = false;

// Only client navigations play the entrance. On the first load it held the
// LCP paint back ~1.2s (Lighthouse, T-613), so that page paints at once and
// matches the server render. While it runs the wrapper is a stacking
// context, so it paints ink: blended images need an opaque backdrop.
export default function Template({ children }: { children: React.ReactNode }) {
  const [enter] = useState(() => appMounted);
  useEffect(() => {
    appMounted = true;
  }, []);
  return (
    <div className={`flex flex-1 flex-col bg-ink${enter ? " animate-route" : ""}`}>
      {children}
    </div>
  );
}
