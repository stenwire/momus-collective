import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { useCartNotice } from "@/lib/cart/notice-store";
import { CartNotice } from "./cart-notice";

describe("CartNotice", () => {
  it("lists dropped items and can be dismissed", async () => {
    useCartNotice.setState({ dropped: [] });
    render(<CartNotice />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    act(() =>
      useCartNotice.getState().setDropped([{ title: "touch grass", reason: "No longer available." }]),
    );
    expect(screen.getByRole("alert")).toHaveTextContent("touch grass: No longer available.");
    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
