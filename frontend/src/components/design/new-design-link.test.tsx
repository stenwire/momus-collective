import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDesignStore } from "@/lib/design/store";
import { designOptions } from "@/test/design-fixtures";
import { NewDesignLink } from "./new-design-link";

vi.mock("next/link", () => ({
  default: ({ children, onClick, ...props }: React.ComponentProps<"a">) => (
    <a
      {...props}
      onClick={(event) => {
        event.preventDefault();
        onClick?.(event);
      }}
    >
      {children}
    </a>
  ),
}));

describe("NewDesignLink", () => {
  beforeEach(() => {
    useDesignStore.setState({
      config: designOptions.defaults,
      savedId: "d1",
      savedConfig: designOptions.defaults,
      name: "Existing design",
    });
  });

  it("clears the active saved id before navigating to design studio", async () => {
    render(<NewDesignLink className="link">Create a shirt design</NewDesignLink>);
    await userEvent.click(screen.getByRole("link", { name: "Create a shirt design" }));

    expect(screen.getByRole("link")).toHaveAttribute("href", "/design");
    expect(useDesignStore.getState()).toMatchObject({ savedId: null, savedConfig: null, name: "" });
  });
});