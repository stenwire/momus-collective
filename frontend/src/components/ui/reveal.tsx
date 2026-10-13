"use client";

import * as m from "motion/react-m";
import type { ReactNode } from "react";
import { STAGGER, ease, fadeUp } from "@/lib/motion";

// Reveals once on entering view. `data-reveal` lets the layout's
// <noscript> rule show it when JS never runs.
export function Reveal({
  children,
  index = 0,
  className,
}: {
  children: ReactNode;
  index?: number;
  className?: string;
}) {
  return (
    <m.div
      data-reveal=""
      className={className}
      variants={fadeUp}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.4, ease: ease.out, delay: index * STAGGER }}
    >
      {children}
    </m.div>
  );
}
