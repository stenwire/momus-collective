import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

// Placeholder scaffold page; T-216 replaces it with the real homepage. The
// alt-text assertion is the part worth keeping — NFR-05 requires it and
// jsx-a11y/alt-text only warns.
describe("Home", () => {
  it("renders a heading", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { level: 1 }),
    ).toBeInTheDocument();
  });

  it("gives every image alt text", () => {
    const { container } = render(<Home />);
    const images = Array.from(container.querySelectorAll("img"));
    expect(images.length).toBeGreaterThan(0);
    for (const img of images) {
      expect(img).toHaveAttribute("alt");
      expect(img.getAttribute("alt")).not.toBe("");
    }
  });
});
