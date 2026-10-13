import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Link from "next/link";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { LazyMotion, domMax } from "motion/react";
import { ProductModal } from "@/components/catalog/product-modal";
import { DISMISS_PX, Sheet, shouldDismiss } from "./sheet";

const mockBack = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ back: mockBack }) }));

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open bag
      </button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        variant="drawer"
        label="Your bag"
        closeLabel="Close bag"
        title={<h2>Your bag</h2>}
        footer={<Link href="/checkout">Checkout</Link>}
      >
        <button type="button">Remove</button>
      </Sheet>
    </>
  );
}

describe("Sheet", () => {
  it("traps Tab inside the dialog in both directions", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Open bag" }));
    const close = screen.getByRole("button", { name: "Close bag" });
    const checkout = screen.getByRole("link", { name: "Checkout" });
    expect(close).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("button", { name: "Remove" })).toHaveFocus();
    await user.tab();
    expect(checkout).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();
    await user.tab({ shift: true });
    expect(checkout).toHaveFocus();
  });

  it("locks page scroll while open and returns focus to the opener on close", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const opener = screen.getByRole("button", { name: "Open bag" });
    await user.click(opener);
    expect(document.body.style.overflow).toBe("hidden");

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
    expect(opener).toHaveFocus();
  });

  it("contains overscroll in the scrolling body", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Open bag" }));
    const body = screen.getByRole("button", { name: "Remove" }).parentElement!;
    expect(body).toHaveClass("overscroll-contain", "overflow-y-auto");
  });

  it("dismisses a drag only past the threshold or on a flick", () => {
    expect(shouldDismiss(DISMISS_PX - 1, 0)).toBe(false);
    expect(shouldDismiss(DISMISS_PX + 1, 0)).toBe(true);
    expect(shouldDismiss(20, 900)).toBe(true);
    expect(shouldDismiss(-50, -900)).toBe(false);
  });
});

describe("ProductModal on Sheet", () => {
  it("is a named dialog", () => {
    render(
      <ProductModal>
        <p>content</p>
      </ProductModal>,
    );
    expect(screen.getByRole("dialog", { name: "Product details" })).toBeInTheDocument();
  });

  it("plays its exit before navigating back", async () => {
    mockBack.mockClear();
    // Features given synchronously: waiting on the app's lazy import made
    // this timing-dependent under a loaded test run.
    render(
      <LazyMotion features={domMax}>
        <ProductModal>
          <p>content</p>
        </ProductModal>
      </LazyMotion>,
    );
    // Escape before the first enter frame would exit from the initial
    // values, which equal the exit target, so motion finishes at once.
    const dialog = screen.getByRole("dialog");
    await waitFor(() => expect(dialog.style.opacity).toBe("1"));
    await userEvent.keyboard("{Escape}");
    expect(mockBack).not.toHaveBeenCalled();
    await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
  });
});
