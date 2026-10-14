import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Template from "./template";

describe("route template", () => {
  it("paints the first page at once and animates later navigations in", () => {
    const first = render(<Template>page one</Template>);
    expect(first.container.firstElementChild).not.toHaveClass("animate-route");
    first.unmount();

    const next = render(<Template>page two</Template>);
    expect(next.container.firstElementChild).toHaveClass("animate-route", "bg-ink");
  });
});
