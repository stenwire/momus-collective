import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProductModal } from "./product-modal";

const mockBack = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: mockBack }),
}));

describe("ProductModal", () => {
  it("moves focus to the close button on mount", () => {
    render(
      <ProductModal>
        <p>content</p>
      </ProductModal>,
    );
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
  });

  it("closes on Escape", async () => {
    mockBack.mockClear();
    const user = userEvent.setup();
    render(
      <ProductModal>
        <p>content</p>
      </ProductModal>,
    );
    await user.keyboard("{Escape}");
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it("closes when the close button is activated", async () => {
    mockBack.mockClear();
    const user = userEvent.setup();
    render(
      <ProductModal>
        <p>content</p>
      </ProductModal>,
    );
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
