"use client";

import { useReducedMotionConfig, useScroll, useSpring, useTransform } from "motion/react";
import * as m from "motion/react-m";
import { useRef, type PointerEvent, type ReactNode } from "react";
import { useMediaQuery } from "@/lib/use-media-query";

const MAX_DEG = 10;
const tiltSpring = { stiffness: 150, damping: 18 };

// Fine pointers tilt the raven toward the cursor; touch screens get a slow
// scroll drift instead. Neither runs under reduced motion.
export function RavenTilt({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotionConfig();
  const finePointer = useMediaQuery("(pointer: fine)");
  const rotateX = useSpring(0, tiltSpring);
  const rotateY = useSpring(0, tiltSpring);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const drift = useTransform(scrollYProgress, [0, 1], [0, 48]);

  if (reduce) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    rotateY.set(((e.clientX - box.left) / box.width - 0.5) * 2 * MAX_DEG);
    rotateX.set(-((e.clientY - box.top) / box.height - 0.5) * 2 * MAX_DEG);
  }

  return (
    <m.div
      ref={ref}
      data-testid="raven-tilt"
      className={className}
      onPointerMove={finePointer ? onPointerMove : undefined}
      onPointerLeave={() => {
        rotateX.set(0);
        rotateY.set(0);
      }}
      style={
        finePointer
          ? { rotateX, rotateY, transformPerspective: 900 }
          : { y: drift }
      }
    >
      {children}
    </m.div>
  );
}
