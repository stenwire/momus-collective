import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/lib/auth/store";
import { signedIn, signedOut } from "@/test/auth";
import { useDesignStore } from "@/lib/design/store";
import { designOptions } from "@/test/design-fixtures";
import { DesignGallery } from "./design-gallery";

const push = vi.fn();
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace }) }));

const design = {
  id: "d1",
  name: "Trust me",
  config: { ...designOptions.defaults, text: "Trust me", font: "anton", placement: "full_front" },
  preview_image_url: "",
  design_file_url: "",
  price: 1300000,
  created_at: "2026-10-11T09:00:00Z",
  updated_at: "2026-10-11T09:00:00Z",
};

const json = (status: number, body: unknown) =>
  ({ ok: status < 400, status, json: async () => body }) as Response;

function renderGallery() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <DesignGallery />
    </QueryClientProvider>,
  );
}

describe("DesignGallery", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let designs: (typeof design)[];

  beforeEach(() => {
    localStorage.clear();
    push.mockReset();
    replace.mockReset();
    designs = [design];
    signedIn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      if (url.includes("/designs/options/")) return json(200, designOptions);
      if (url.endsWith("/duplicate/")) {
        const copy = { ...design, id: "d2", name: "Trust me (copy)" };
        designs = [...designs, copy];
        return json(201, copy);
      }
      if (method === "DELETE") {
        designs = designs.filter((d) => !url.endsWith(`/${d.id}/`));
        return json(204, {});
      }
      if (url.endsWith("/export/")) return json(202, { status: "queued" });
      if (url.endsWith("/designs/d1/")) return json(200, { ...design, design_file_url: "http://f/" });
      return json(200, designs);
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("shows each design's thumbnail, creation date and configuration", async () => {
    renderGallery();
    const card = (await screen.findByRole("heading", { name: "Trust me" })).closest("li")!;
    expect(within(card).getByRole("img", { name: "Preview of Trust me" })).toBeInTheDocument();
    expect(card).toHaveTextContent("Created 11 Oct 2026");
    expect(card).toHaveTextContent("Anton");
    expect(card).toHaveTextContent("Full Front");
    expect(card).toHaveTextContent("₦13,000");
  });

  it("edit restores every setting in the tool", async () => {
    renderGallery();
    await userEvent.click(await screen.findByRole("button", { name: "Edit Trust me" }));
    expect(useDesignStore.getState()).toMatchObject({ savedId: "d1", config: design.config });
    expect(push).toHaveBeenCalledWith("/design");
  });

  it("duplicates a design and shows the copy", async () => {
    renderGallery();
    await userEvent.click(await screen.findByRole("button", { name: "Duplicate Trust me" }));
    expect(await screen.findByRole("heading", { name: "Trust me (copy)" })).toBeInTheDocument();
  });

  it("deletes only after a confirming second press", async () => {
    renderGallery();
    await userEvent.click(await screen.findByRole("button", { name: "Delete Trust me" }));
    expect(fetchMock.mock.calls.some(([, i]) => i?.method === "DELETE")).toBe(false);
    await userEvent.click(screen.getByRole("button", { name: "Confirm delete" }));
    expect(await screen.findByText(/No saved designs yet/)).toBeInTheDocument();
  });

  it("adds a saved design to the cart by generating its print file", async () => {
    renderGallery();
    await userEvent.click(await screen.findByRole("button", { name: "Add Trust me to cart" }));
    expect(await screen.findByText("Print-ready file created at 300 DPI.")).toBeInTheDocument();
  });

  it("sends a signed-out visitor to log in", async () => {
    signedOut();
    renderGallery();
    expect(replace).toHaveBeenCalledWith("/login?next=/account/designs");
  });

  it("does not bounce to log in when the user logs out from here", async () => {
    renderGallery();
    await screen.findByRole("heading", { name: "Trust me" });
    act(() => useAuthStore.getState().signOut());
    expect(replace).not.toHaveBeenCalled();
  });
});
