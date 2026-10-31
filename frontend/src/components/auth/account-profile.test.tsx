import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signedIn, signedOut } from "@/test/auth";
import { AccountProfile } from "./account-profile";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

const settings = {
  id: "u1",
  email: "ada@example.com",
  first_name: "Ada",
  last_name: "Lovelace",
  phone: "+2348000000000",
  notification_pref: "email" as const,
};
const address = {
  id: "a1",
  label: "Home",
  full_name: "Ada Lovelace",
  phone: "+2348000000000",
  address_line_1: "1 Marina Road",
  address_line_2: "",
  city: "Lagos",
  state: "Lagos",
  lga: "Eti-Osa",
  is_default: true,
  created_at: "2026-10-01T00:00:00Z",
};
const json = (status: number, body: unknown) =>
  ({ ok: status < 400, status, json: async () => body }) as Response;

function renderProfile() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <AccountProfile />
    </QueryClientProvider>,
  );
}

describe("AccountProfile", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let currentSettings: typeof settings;
  let addresses: typeof address[];

  beforeEach(() => {
    replace.mockReset();
    signedIn();
    currentSettings = { ...settings };
    addresses = [address];
    fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      if (url.includes("/checkout/options/")) return json(200, { states: ["Lagos", "Ogun"], lagos_lgas: ["Eti-Osa", "Surulere"] });
      if (url.includes("/addresses/") && url.includes("/set_default/")) return json(200, address);
      if (url.includes("/addresses/")) {
        if (method === "GET") return json(200, addresses);
        if (method === "POST") {
          const created = { ...address, ...JSON.parse(String(init?.body)), id: "a2", is_default: false };
          addresses = [...addresses, created];
          return json(201, created);
        }
        return json(204, {});
      }
      if (url.includes("/account/email/")) return json(200, { detail: "Check the new address for a confirmation link." });
      if (url.includes("/account/password/")) return json(200, { detail: "Password changed." });
      if (url.endsWith("/account/")) {
        if (method === "PATCH") currentSettings = { ...currentSettings, ...JSON.parse(String(init?.body)) };
        return json(200, currentSettings);
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("shows personal details and saves profile changes", async () => {
    renderProfile();
    expect(await screen.findByText("ada@example.com")).toBeInTheDocument();
    const firstName = screen.getByLabelText("First name");
    await userEvent.clear(firstName);
    await userEvent.type(firstName, "Augusta");
    await userEvent.click(screen.getByRole("button", { name: "Save details" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Personal details saved.");
    const [, request] = fetchMock.mock.calls.find(([, init]) => init?.method === "PATCH")!;
    expect(JSON.parse(String(request.body))).toMatchObject({ first_name: "Augusta", phone: "+2348000000000" });
  });

  it("lets the customer change their password", async () => {
    renderProfile();
    await screen.findByLabelText("Current password");
    await userEvent.type(screen.getByLabelText("Current password"), "old-password");
    await userEvent.type(screen.getByLabelText("New password"), "new-password-123");
    await userEvent.click(screen.getByRole("button", { name: "Update password" }));

    expect(await screen.findByText("Password changed.")).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => url.includes("/account/password/"))).toBe(true);
  });

  it("can add an address and requires login for signed-out visitors", async () => {
    renderProfile();
    await userEvent.click(await screen.findByRole("button", { name: "Add address" }));
    await userEvent.type(screen.getByLabelText("Address label"), "Work");
    await userEvent.type(screen.getByLabelText("Full name"), "Ada Lovelace");
    await userEvent.type(screen.getByLabelText("Phone number"), "8000000000");
    await userEvent.type(screen.getByLabelText("Address"), "2 Broad Street");
    await userEvent.type(screen.getByLabelText("City or town"), "Lagos");
    await userEvent.selectOptions(screen.getByLabelText("State"), "Lagos");
    await userEvent.selectOptions(await screen.findByLabelText("LGA"), "Surulere");
    await userEvent.click(screen.getByRole("button", { name: "Add address" }));
    expect(await screen.findByText(/2 Broad Street/)).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "POST")).toBe(true);

    signedOut();
    renderProfile();
    expect(replace).toHaveBeenCalledWith("/login?next=/account/profile");
  });
});
