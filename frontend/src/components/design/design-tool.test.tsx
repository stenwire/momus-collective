import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDesignStore } from "@/lib/design/store";
import { designOptions, mockDesignApi } from "@/test/design-fixtures";
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
    localStorage.clear();
    useDesignStore.setState({ config: null, savedId: null, name: "" });
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    vi.stubGlobal("fetch", mockDesignApi());
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

  it("adjusts size, alignment and spacing", async () => {
    renderTool();
    await userEvent.click(await screen.findByRole("button", { name: "Extra Large" }));
    await userEvent.click(screen.getByRole("button", { name: "Right" }));
    await userEvent.click(screen.getByRole("button", { name: "Extra Wide" }));
    const config = useDesignStore.getState().config;
    expect(config?.font_size).toBe("extra_large");
    expect(config?.alignment).toBe("right");
    expect(config?.letter_spacing).toBe("extra_wide");
  });

  it("offers only readable text colours and swaps one that would vanish", async () => {
    renderTool();
    const textColors = await screen.findByRole("group", { name: /Text color/ });
    expect(within(textColors).getAllByRole("button").map((b) => b.getAttribute("aria-label"))).toEqual(["Off White", "Gold"]);
    await userEvent.click(screen.getByRole("button", { name: "White" }));
    expect(useDesignStore.getState().config?.text_color).toBe("Ink Black");
    expect(within(textColors).getAllByRole("button").map((b) => b.getAttribute("aria-label"))).toEqual(["Ink Black"]);
  });

  it("offers exactly the four placements, Center Chest by default", async () => {
    renderTool();
    const group = await screen.findByRole("group", { name: "Placement" });
    const buttons = within(group).getAllByRole("button");
    expect(buttons.map((b) => b.textContent)).toEqual([
      "Upper Chest",
      "Center Chest",
      "Lower Chest",
      "Full Front",
    ]);
    expect(within(group).getByRole("button", { name: "Center Chest" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(within(group).getByRole("button", { name: "Full Front" }));
    expect(useDesignStore.getState().config?.placement).toBe("full_front");
  });

  it("previews a clean mockup with no editing controls, and returns", async () => {
    renderTool();
    await userEvent.type(await screen.findByLabelText("Your slogan"), "hi");
    await userEvent.click(screen.getByRole("button", { name: "Preview" }));

    const dialog = screen.getByRole("dialog", { name: "Design preview" });
    expect(within(dialog).getByRole("img", { name: "Finished shirt preview: hi" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Your slogan")).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Font" })).not.toBeInTheDocument();
    const back = screen.getByRole("button", { name: "Back to editing" });
    expect(back).toHaveFocus();

    await userEvent.click(back);
    expect(screen.getByLabelText("Your slogan")).toHaveValue("hi");
  });

  it("closes the preview on Escape", async () => {
    renderTool();
    await userEvent.click(await screen.findByRole("button", { name: "Preview" }));
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Your slogan")).toBeInTheDocument();
  });

  it("applies a template's layout but keeps the user's colours", async () => {
    renderTool();
    await userEvent.click(await screen.findByRole("button", { name: "Navy" }));
    await userEvent.click(screen.getByRole("button", { name: "Use template: Trust Me" }));
    const config = useDesignStore.getState().config;
    expect(config).toMatchObject({
      text: "Trust me\n(I googled it)",
      font: "anton",
      font_size: "large",
      alignment: "left",
      letter_spacing: "wide",
      placement: "full_front",
      shirt_color: "Navy",
      text_color: "Off White",
    });
    expect(screen.getByLabelText("Your slogan")).toHaveValue("Trust me\n(I googled it)");
  });

  it("groups templates under their style", async () => {
    renderTool();
    const group = await screen.findByRole("group", { name: "Disclaimer Style" });
    expect(within(group).getByRole("button", { name: "Use template: Trust Me" })).toBeInTheDocument();
  });

  it("shows the server's price for the chosen shirt colour", async () => {
    renderTool();
    expect(await screen.findByText("₦12,500")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Navy" }));
    expect(await screen.findByText("₦13,000")).toBeInTheDocument();
  });
});
