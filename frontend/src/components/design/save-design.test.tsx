import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/lib/auth/store";
import { useDesignStore } from "@/lib/design/store";
import { designOptions } from "@/test/design-fixtures";
import { SaveDesign } from "./save-design";

const config = { ...designOptions.defaults, text: "touch grass\nplease" };
const json = (status: number, body: unknown) =>
  ({ ok: status < 400, status, json: async () => body }) as Response;

describe("SaveDesign", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    useDesignStore.setState({ config, savedId: null, name: "" });
    useAuthStore.setState({ tokens: null, email: null });
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("prompts a guest to register, returning to the tool", async () => {
    render(<SaveDesign config={config} />);
    await userEvent.click(screen.getByRole("button", { name: "Save design" }));
    const prompt = screen.getByRole("region", { name: "Save your design" });
    expect(prompt).toHaveTextContent("Create a free account");
    expect(screen.getByRole("link", { name: "Create an account" })).toHaveAttribute(
      "href",
      "/register?next=/design",
    );
    expect(screen.getByRole("link", { name: "I already have one" })).toHaveAttribute(
      "href",
      "/login?next=/design",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("saves a new design, then updates the same one", async () => {
    useAuthStore.setState({ tokens: { access: "a", refresh: "r" } });
    fetchMock
      .mockResolvedValueOnce(json(201, { id: "d1", name: "touch grass", config }))
      .mockResolvedValueOnce(json(200, { id: "d1", name: "touch grass", config }));
    render(<SaveDesign config={config} />);
    expect(screen.getByLabelText("Design name")).toHaveValue("touch grass");

    await userEvent.click(screen.getByRole("button", { name: "Save design" }));
    expect(await screen.findByText("Saved to your designs.")).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/v1\/designs\/$/);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ name: "touch grass", config });
    expect((init.headers as Headers).get("Authorization")).toBe("Bearer a");
    expect(useDesignStore.getState().savedId).toBe("d1");

    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Changes saved.")).toBeInTheDocument();
    expect(fetchMock.mock.calls[1][0]).toMatch(/\/api\/v1\/designs\/d1\/$/);
    expect(fetchMock.mock.calls[1][1].method).toBe("PATCH");
  });

  it("shows the server's validation message", async () => {
    useAuthStore.setState({ tokens: { access: "a", refresh: "r" } });
    fetchMock.mockResolvedValueOnce(
      json(400, { config: { text_color: "Gold isn't readable on a White shirt." } }),
    );
    render(<SaveDesign config={config} />);
    await userEvent.click(screen.getByRole("button", { name: "Save design" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("isn't readable");
  });
});

describe("useDesignStore.initialize", () => {
  it("keeps a saved draft and fills keys an older draft lacks", () => {
    const oldDraft: Partial<typeof designOptions.defaults> = {
      ...designOptions.defaults,
      text: "kept",
    };
    delete oldDraft.font_size;
    useDesignStore.setState({ config: oldDraft as typeof designOptions.defaults });
    useDesignStore.getState().initialize(designOptions.defaults);
    expect(useDesignStore.getState().config).toMatchObject({
      text: "kept",
      font_size: "medium",
    });
  });
});
