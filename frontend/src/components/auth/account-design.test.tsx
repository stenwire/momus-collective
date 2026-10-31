import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { OrderProgress } from "@/components/orders/order-summary";
import { EmptyState } from "@/components/ui/empty-state";
import type { Order } from "@/lib/orders/types";
import { AccountTabs } from "./account-tabs";
import { FormErrors } from "./form-field";

const haptic = vi.fn();
vi.mock("@/lib/haptics", () => ({ haptic: (p: string) => haptic(p) }));

function Submitter() {
  const [errors, setErrors] = useState<string[]>([]);
  return (
    <>
      <button type="button" onClick={() => setErrors(["Email or password is wrong."])}>
        Log in
      </button>
      <FormErrors messages={errors} />
    </>
  );
}

describe("FormErrors", () => {
  it("takes focus and buzzes when a submit fails", async () => {
    render(<Submitter />);
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect(screen.getByRole("alert")).toHaveFocus();
    expect(haptic).toHaveBeenCalledWith("error");
  });
});

describe("AccountTabs", () => {
  it("marks the current page and moves the underline on tap", async () => {
    const { container } = render(<AccountTabs current="/account/orders" />);
    expect(screen.getByRole("link", { name: "Orders" })).toHaveAttribute("aria-current", "page");
    const designs = screen.getByRole("link", { name: "Designs" });
    designs.addEventListener("click", (e) => e.preventDefault());
    await userEvent.click(designs);
    expect(designs.querySelector('[aria-hidden="true"]')).not.toBeNull();
    expect(container.querySelectorAll('a [aria-hidden="true"]')).toHaveLength(1);
  });
});

describe("OrderProgress", () => {
  const pipeline = ["Paid", "Shirt Acquired", "Printed", "Out for Delivery", "Delivered"].map(
    (label, i) => ({ status: `s${i}`, label }),
  );

  it("fills the bars in order up to the current step", () => {
    render(
      <OrderProgress
        order={{ pipeline, pipeline_step: 2, status: "printed", status_label: "Printed" } as unknown as Order}
      />,
    );
    const fills = screen.getAllByTestId("step-fill");
    expect(fills).toHaveLength(3);
    expect(fills.map((f) => f.style.animationDelay)).toEqual(["0ms", "120ms", "240ms"]);
    expect(screen.getByText("Printed")).toHaveAttribute("aria-current", "step");
  });
});

describe("EmptyState", () => {
  it("shows the raven with the message", () => {
    render(<EmptyState title="Nothing ordered">No orders yet.</EmptyState>);
    expect(screen.getByRole("img", { name: /raven/i })).toBeInTheDocument();
    expect(screen.getByText("No orders yet.")).toBeInTheDocument();
  });
});
