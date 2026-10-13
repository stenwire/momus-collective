import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HapticsToggle } from "./haptics-toggle";

afterEach(() => {
  Reflect.deleteProperty(navigator, "vibrate");
  localStorage.clear();
});

describe("HapticsToggle", () => {
  it("is absent where the device cannot do haptics", () => {
    render(<HapticsToggle />);
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });

  it("switches haptics off and remembers it", async () => {
    Object.defineProperty(navigator, "vibrate", { value: vi.fn(), configurable: true });
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
