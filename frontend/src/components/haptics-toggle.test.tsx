import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HapticsToggle } from "./haptics-toggle";

function device({ coarse }: { coarse: boolean }) {
  Object.defineProperty(navigator, "vibrate", { value: vi.fn(), configurable: true });
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: coarse && q.includes("coarse"),
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

afterEach(() => {
  Reflect.deleteProperty(navigator, "vibrate");
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("HapticsToggle", () => {
  it("is absent where the device cannot do haptics", () => {
    render(<HapticsToggle />);
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });

  it("stays hidden on desktop Chrome, whose vibrate does nothing", () => {
    device({ coarse: false });
    render(<HapticsToggle />);
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });

  it("switches haptics off and remembers it", async () => {
    device({ coarse: true });
    render(<HapticsToggle />);
    const toggle = screen.getByRole("switch", { name: /haptics on/i });
    expect(toggle).toHaveAttribute("aria-checked", "true");

    await userEvent.click(toggle);

    expect(screen.getByRole("switch", { name: /haptics off/i })).toHaveAttribute(
      "aria-checked",
      "false",
    );
    expect(localStorage.getItem("momus-haptics")).toBe("off");
  });
});
