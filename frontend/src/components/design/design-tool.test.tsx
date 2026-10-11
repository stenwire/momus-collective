import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDesignStore } from "@/lib/design/store";
import { designOptions } from "@/test/design-fixtures";
import { DesignTool } from "./design-tool";

function renderTool() {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <DesignTool />
    </QueryClientProvider>,
  );
}

describe("DesignTool", () => {
  beforeEach(() => {
    useDesignStore.setState({ config: null });
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => designOptions }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("starts from the backend's defaults", async () => {
    renderTool();
    expect(
      await screen.findByRole("img", { name: "Shirt mockup: no text yet" }),
    ).toBeInTheDocument();
    expect(useDesignStore.getState().config).toEqual(designOptions.defaults);
  });

  it("re-renders the mockup live as the user types", async () => {
    renderTool();
    const input = await screen.findByLabelText("Your slogan");
    await userEvent.type(input, "touch grass");
    expect(useDesignStore.getState().config?.text).toBe("touch grass");
    expect(
      screen.getByRole("img", { name: "Shirt mockup: touch grass" }),
    ).toBeInTheDocument();
  });

  it("switches the shirt color when a swatch is pressed", async () => {
    renderTool();
    const navy = await screen.findByRole("button", { name: "Navy" });
    expect(navy).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(navy);
    expect(useDesignStore.getState().config?.shirt_color).toBe("Navy");
    expect(navy).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("group", { name: /Shirt color: Navy/ })).toBeInTheDocument();
  });

  it("counts characters live and stops at 80", async () => {
    renderTool();
    const input = await screen.findByLabelText("Your slogan");
    await userEvent.type(input, "abc");
    expect(screen.getByText("3/80")).toBeInTheDocument();
    await userEvent.type(input, "x".repeat(90));
    expect(useDesignStore.getState().config?.text).toHaveLength(80);
    expect(screen.getByText("80/80")).toBeInTheDocument();
  });

  it("sanitizes pasted text before it reaches the store", async () => {
    renderTool();
    const input = await screen.findByLabelText("Your slogan");
    await userEvent.click(input);
    await userEvent.paste("zero\u200bwidth\u0007");
    expect(useDesignStore.getState().config?.text).toBe("zerowidth");
  });

  it("previews each font in its own face and switches on press", async () => {
    renderTool();
    const anton = await screen.findByRole("button", { name: "Anton" });
    expect(anton).toHaveStyle({ fontFamily: "'Anton'" });
    expect(screen.getByRole("button", { name: "Archivo Black" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await userEvent.click(anton);
    expect(useDesignStore.getState().config?.font).toBe("anton");
    expect(anton).toHaveAttribute("aria-pressed", "true");
  });
});
