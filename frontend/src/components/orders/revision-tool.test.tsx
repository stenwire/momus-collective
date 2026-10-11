import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/lib/auth/store";
import { designOptions } from "@/test/design-fixtures";
import { order } from "@/test/order";
import { RevisionTool } from "./revision-tool";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const config = { ...designOptions.defaults, shirt_color: "Black", text: "TOO SMALL" };
const rejected = {
  ...order,
  status: "moderation",
  items: [{ ...order.items[0], id: "d1", kind: "design", design_config: config }],
  design_review: { reason_label: "Unprintable design", details: "The text is too small.", customer_choice: "" },
};

function api(tracked: unknown, reviseStatus = 204) {
  const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async (url) => {
    if (url.includes("/revise/")) {
      return {
        ok: reviseStatus < 400,
        status: reviseStatus,
        json: async () => (reviseStatus < 400 ? {} : { shirt_color: "The shirt colour can't change; it set the price." }),
      } as Response;
    }
    if (url.includes("/designs/options/")) return { ok: true, status: 200, json: async () => designOptions } as Response;
    return { ok: true, status: 200, json: async () => tracked } as Response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderTool() {
  useAuthStore.setState({ status: "signed-out", user: null, csrf: null });
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <RevisionTool token="tok" itemId="d1" />
    </QueryClientProvider>,
  );
}

describe("RevisionTool", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    push.mockClear();
  });

  it("starts from the rejected design, keeps the shirt colour and sends the revision", async () => {
    const fetchMock = api(rejected);
    renderTool();
    const slogan = await screen.findByLabelText(/slogan/i);
    expect(slogan).toHaveValue("TOO SMALL");
    expect(screen.getByText(/Reason: Unprintable design. The text is too small./)).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Shirt color" })).not.toBeInTheDocument();
    const send = screen.getByRole("button", { name: "Send revised design" });
    expect(send).toBeDisabled();
    await userEvent.clear(slogan);
    await userEvent.type(slogan, "BIGGER");
    await userEvent.click(send);
    const call = fetchMock.mock.calls.find(([u]) => u.includes("/revise/"))!;
    expect(call[0]).toContain("/api/v1/orders/track/tok/items/d1/revise/");
    expect(JSON.parse(String(call[1]!.body)).config).toMatchObject({ text: "BIGGER", shirt_color: "Black" });
    expect(push).toHaveBeenCalledWith("/track/tok?revised=1");
  });

  it("shows the server's reason when a revision is refused", async () => {
    api(rejected, 400);
    renderTool();
    const slogan = await screen.findByLabelText(/slogan/i);
    await userEvent.type(slogan, "!");
    await userEvent.click(screen.getByRole("button", { name: "Send revised design" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("shirt colour can't change");
    expect(push).not.toHaveBeenCalled();
  });

  it("says so when nothing is waiting for a revision", async () => {
    api({ ...rejected, design_review: undefined });
    renderTool();
    expect(await screen.findByText(/isn't waiting for a revision/)).toBeInTheDocument();
  });
});
