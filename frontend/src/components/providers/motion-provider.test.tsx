import { render, screen } from "@testing-library/react";
import { motion, MotionConfigContext } from "motion/react";
import * as m from "motion/react-m";
import { useContext } from "react";
import { describe, expect, it, vi } from "vitest";
import { exitDuration, duration, spring } from "@/lib/motion";
import { MotionProvider } from "./motion-provider";

function ReducedMotionProbe() {
  return <p>{useContext(MotionConfigContext).reducedMotion}</p>;
}

describe("MotionProvider", () => {
  it("defers to the visitor's reduced-motion setting", () => {
    render(
      <MotionProvider>
        <ReducedMotionProbe />
      </MotionProvider>,
    );
    expect(screen.getByText("user")).toBeInTheDocument();
  });

  it("renders the light m components", () => {
    render(
      <MotionProvider>
        <m.div>stamped</m.div>
      </MotionProvider>,
    );
    expect(screen.getByText("stamped")).toBeInTheDocument();
  });

  it("refuses the full motion components (strict)", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      render(
        <MotionProvider>
          <motion.div>heavy</motion.div>
        </MotionProvider>,
      ),
    ).toThrow();
    vi.restoreAllMocks();
  });
});

describe("motion tokens", () => {
  it("runs exits at about 70% of the enter time", () => {
    expect(exitDuration(duration.medium)).toBeCloseTo(0.224);
    expect(exitDuration(duration.long)).toBeLessThan(duration.long);
  });

  it("orders springs from snappiest to softest", () => {
    expect(spring.snap.stiffness).toBeGreaterThan(spring.press.stiffness);
    expect(spring.press.stiffness).toBeGreaterThan(spring.settle.stiffness);
  });
});
