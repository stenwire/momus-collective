import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ACTION_TOAST_MS, TOAST_MS, toast, useToasts } from "@/lib/toast";
import { Button, buttonClasses } from "./button";
import { Chip } from "./chip";
import { Counter } from "./counter";
import { IconButton } from "./icon-button";
import { inputClasses } from "./input";
import { KineticText } from "./kinetic-text";
import { Marquee } from "./marquee";
import { Toaster } from "./toaster";

afterEach(() => {
  useToasts.setState({ toasts: [] });
  vi.useRealTimers();
});

describe("Button", () => {
  it("keeps its label as the accessible name while loading, and blocks presses", async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Pay ₦12,500
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Pay ₦12,500" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    // jsdom applies no Tailwind CSS, so pin the hiding mechanism itself:
    // opacity keeps the label in the a11y tree; invisible/hidden would not.
    const label = screen.getByText("Pay ₦12,500");
    expect(label).toHaveClass("opacity-0");
    expect(label).not.toHaveClass("invisible", "hidden", "sr-only");
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("defaults to type=button so it never submits a form by accident", () => {
    render(<Button>Go</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("meets the 44px touch floor at every size", () => {
    for (const size of ["sm", "md", "lg"] as const) {
      expect(buttonClasses({ size })).toMatch(/min-h-(11|14)/);
    }
  });
});

describe("Chip and IconButton", () => {
  it("exposes the selected state as aria-pressed", () => {
    render(
      <>
        <Chip selected>M</Chip>
        <Chip selected={false}>L</Chip>
      </>,
    );
    expect(screen.getByRole("button", { name: "M" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "L" })).toHaveAttribute("aria-pressed", "false");
  });

  it("names an icon-only button", () => {
    render(
      <IconButton label="Close bag">
        <svg aria-hidden="true" />
      </IconButton>,
    );
    expect(screen.getByRole("button", { name: "Close bag" })).toHaveClass("size-11");
  });
});

describe("inputClasses", () => {
  // cn() does not merge conflicting utilities, so a width here would beat
  // whatever width a caller adds (the shop's search box collapsed that way).
  it("leaves width to the caller", () => {
    expect(inputClasses).not.toMatch(/(^|\s)(w-|flex-1)/);
  });
});

describe("KineticText", () => {
  it("reads as one string, not word by word", () => {
    render(<KineticText as="h1" text="dressed up, filtered out." />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("dressed up, filtered out.");
    const animated = heading.querySelector('[aria-hidden="true"]');
    expect(animated?.querySelectorAll(".animate-rise")).toHaveLength(4);
  });
});

describe("Counter", () => {
  it("exposes the number once and rolls each digit into place", () => {
    const { container, rerender } = render(<Counter value={7} />);
    expect(screen.getByText("7", { selector: ".sr-only" })).toBeInTheDocument();
    rerender(<Counter value={12} />);
    expect(screen.getByText("12", { selector: ".sr-only" })).toBeInTheDocument();
    const columns = container.querySelectorAll("[data-digit]");
    expect([...columns].map((c) => (c as HTMLElement).style.transform)).toEqual([
      "translateY(-10%)",
      "translateY(-20%)",
    ]);
  });
});

describe("Marquee", () => {
  it("can be paused and hides its duplicate run from assistive tech", async () => {
    render(<Marquee label="Slogans" items={["One", "Two"]} />);
    expect(screen.getByRole("region", { name: "Slogans" })).toBeInTheDocument();
    expect(screen.getAllByRole("list")).toHaveLength(1);

    await userEvent.click(screen.getByRole("button", { name: "Pause slogans" }));
    expect(screen.getByTestId("marquee-track")).toHaveAttribute("data-paused", "true");
    expect(screen.getByRole("button", { name: "Play slogans" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});

describe("toast", () => {
  it("announces politely, runs its action and disappears on time", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const undo = vi.fn();
    render(<Toaster />);

    act(() => {
      toast("Removed from bag", { action: { label: "Undo", onClick: undo } });
      toast("Saved");
    });
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
    expect(screen.getByText("Removed from bag")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(TOAST_MS));
    expect(useToasts.getState().toasts.map((t) => t.message)).toEqual(["Removed from bag"]);

    await userEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(undo).toHaveBeenCalledOnce();
    expect(useToasts.getState().toasts).toHaveLength(0);
    expect(ACTION_TOAST_MS).toBeGreaterThan(TOAST_MS);
  });

  it("keeps at most three on screen", () => {
    act(() => ["a", "b", "c", "d"].forEach((m) => toast(m)));
    expect(useToasts.getState().toasts.map((t) => t.message)).toEqual(["b", "c", "d"]);
  });
});
