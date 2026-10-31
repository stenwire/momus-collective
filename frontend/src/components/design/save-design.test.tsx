import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signedIn, signedOut } from "@/test/auth";
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
    useDesignStore.setState({ config, savedId: null, savedConfig: null, name: "" });
    signedOut();
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
    signedIn();
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
    expect((init.headers as Headers).get("X-CSRFToken")).toBe("csrf-token");
    expect(init.credentials).toBe("include");
    expect(useDesignStore.getState().savedId).toBe("d1");

    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Changes saved.")).toBeInTheDocument();
    expect(fetchMock.mock.calls[1][0]).toMatch(/\/api\/v1\/designs\/d1\/$/);
    expect(fetchMock.mock.calls[1][1].method).toBe("PATCH");
  });

  it("starts another design without changing the saved design", async () => {
    signedIn();
    useDesignStore.setState({ savedId: "d1", savedConfig: config });
    render(<SaveDesign config={config} />);

    await userEvent.click(screen.getByRole("button", { name: "Start another design" }));

    expect(useDesignStore.getState()).toMatchObject({
      savedId: null,
      savedConfig: null,
      config,
    });
    expect(screen.getByRole("button", { name: "Save design" })).toBeInTheDocument();
  });

  it("shows the server's validation message", async () => {
    signedIn();
    fetchMock.mockResolvedValueOnce(
      json(400, { config: { text_color: "Gold isn't readable on a White shirt." } }),
    );
    render(<SaveDesign config={config} />);
    await userEvent.click(screen.getByRole("button", { name: "Save design" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("isn't readable");
  });
});

describe("Add to cart", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  const saved = { id: "d1", name: "touch grass", config, design_file_url: "" };

  beforeEach(() => {
    localStorage.clear();
    useDesignStore.setState({ config, savedId: null, savedConfig: null, name: "" });
    signedIn();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("saves an unsaved design, then generates its print file", async () => {
    fetchMock
      .mockResolvedValueOnce(json(201, saved))
      .mockResolvedValueOnce(json(202, { status: "queued" }))
      .mockResolvedValueOnce(json(200, { ...saved, design_file_url: "http://api/file/" }));
    render(<SaveDesign config={config} />);
    await userEvent.click(screen.getByRole("button", { name: "Add to cart" }));
    expect(await screen.findByText("Print-ready file created at 300 DPI.")).toBeInTheDocument();
    const calls = fetchMock.mock.calls.map(([url, init]) => `${init?.method ?? "GET"} ${url.replace(/^.*\/api\/v1/, "")}`);
    expect(calls).toEqual(["POST /designs/", "POST /designs/d1/export/", "GET /designs/d1/"]);
  });

  it("skips the save when the design is already saved and unchanged", async () => {
    useDesignStore.setState({ savedId: "d1", savedConfig: { ...config } });
    fetchMock
      .mockResolvedValueOnce(json(202, { status: "queued" }))
      .mockResolvedValueOnce(json(200, { ...saved, design_file_url: "http://api/file/" }));
    render(<SaveDesign config={config} />);
    await userEvent.click(screen.getByRole("button", { name: "Add to cart" }));
    await screen.findByText("Print-ready file created at 300 DPI.");
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/designs\/d1\/export\/$/);
  });

  it("re-saves first when the design changed since it was saved", async () => {
    useDesignStore.setState({ savedId: "d1", savedConfig: { ...config, text: "old" } });
    fetchMock
      .mockResolvedValueOnce(json(200, saved))
      .mockResolvedValueOnce(json(202, { status: "queued" }))
      .mockResolvedValueOnce(json(200, { ...saved, design_file_url: "http://api/file/" }));
    render(<SaveDesign config={config} />);
    await userEvent.click(screen.getByRole("button", { name: "Add to cart" }));
    await screen.findByText("Print-ready file created at 300 DPI.");
    expect(fetchMock.mock.calls[0][1].method).toBe("PATCH");
  });

  it("sends a guest to the account prompt instead", async () => {
    signedOut();
    render(<SaveDesign config={config} />);
    await userEvent.click(screen.getByRole("button", { name: "Add to cart" }));
    expect(screen.getByRole("region", { name: "Save your design" })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
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
