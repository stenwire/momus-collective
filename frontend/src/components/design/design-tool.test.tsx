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
});
