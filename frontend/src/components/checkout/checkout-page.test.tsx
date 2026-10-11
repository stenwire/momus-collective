import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useGuestCart } from "@/lib/cart/guest-store";
import { signedIn, signedOut } from "@/test/auth";
import { CheckoutPage } from "./checkout-page";

const product = { id: "p1", slug: "tg", slogan: "touch grass", image: null, price: 1500000 };
const options = { states: ["Abia", "Lagos", "Oyo"], lagos_lgas: ["Eti-Osa", "Ikeja"] };
const address = {
  id: "a1",
  label: "Home",
  full_name: "Ada Lovelace",
  phone: "+2348000000000",
  address_line_1: "12 Admiralty Way",
  address_line_2: "",
  city: "Lekki",
  state: "Lagos",
  lga: "Eti-Osa",
  is_default: true,
};
const json = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response;

function api(serverCart?: unknown) {
  return vi.fn(async (url: string) => {
    if (url.includes("/checkout/options/")) return json(options);
    if (url.includes("/addresses/")) return json([address]);
    if (url.includes("/cart/")) return json(serverCart);
    return json({});
  });
}

function renderCheckout() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <CheckoutPage />
    </QueryClientProvider>,
  );
}

describe("CheckoutPage", () => {
  beforeEach(() => {
    localStorage.clear();
    useGuestCart.setState({ lines: [] });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("lays out shipping, order summary and payment on one page", async () => {
    signedOut();
    useGuestCart.getState().add({ product, size: "M", color: "Black", quantity: 1 });
    vi.stubGlobal("fetch", api());
    renderCheckout();
    for (const name of ["Shipping information", "Order summary", "Payment"]) {
      expect(await screen.findByRole("region", { name })).toBeInTheDocument();
    }
    const summary = screen.getByRole("region", { name: "Order summary" });
    expect(summary).toHaveTextContent("touch grass");
  });

  it("offers a Lagos LGA dropdown, and free text elsewhere", async () => {
    signedOut();
    useGuestCart.getState().add({ product, size: "M", color: "Black", quantity: 1 });
    vi.stubGlobal("fetch", api());
    renderCheckout();
    const state = await screen.findByLabelText("State");
    await userEvent.selectOptions(state, "Lagos");
    expect(screen.getByLabelText("LGA").tagName).toBe("SELECT");
    await userEvent.selectOptions(state, "Oyo");
    expect(screen.getByLabelText("LGA").tagName).toBe("INPUT");
  });

  it("fills the form from a saved address", async () => {
    signedIn();
    vi.stubGlobal(
      "fetch",
      api({
        items: [
          {
            id: "l1",
            kind: "product",
            product,
            design: null,
            size: "M",
            color: "Black",
            quantity: 1,
            unit_price: 1500000,
            line_total: 1500000,
          },
        ],
        item_count: 1,
        subtotal: 1500000,
      }),
    );
    renderCheckout();
    await userEvent.selectOptions(await screen.findByLabelText("Saved addresses"), "a1");
    expect(screen.getByLabelText("Full name")).toHaveValue("Ada Lovelace");
    expect(screen.getByLabelText("State")).toHaveValue("Lagos");
    expect(screen.getByLabelText("LGA")).toHaveValue("Eti-Osa");
  });

  it("flags missing delivery details when paying", async () => {
    signedOut();
    useGuestCart.getState().add({ product, size: "M", color: "Black", quantity: 1 });
    vi.stubGlobal("fetch", api());
    renderCheckout();
    await userEvent.click(await screen.findByRole("button", { name: "Pay now" }));
    expect(screen.getByRole("status")).toHaveTextContent("Check the highlighted delivery details.");
    expect(screen.getByText("Enter the recipient's full name.")).toBeInTheDocument();
    const name = screen.getByLabelText("Full name");
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(name).toHaveAccessibleDescription("Enter the recipient's full name.");
  });

  it("edits the cart from checkout", async () => {
    signedOut();
    useGuestCart.getState().add({ product, size: "M", color: "Black", quantity: 1 });
    vi.stubGlobal("fetch", api());
    renderCheckout();
    const summary = await screen.findByRole("region", { name: "Order summary" });
    await userEvent.click(within(summary).getByRole("button", { name: "Increase quantity of touch grass" }));
    expect(useGuestCart.getState().lines[0].quantity).toBe(2);
    expect(summary).toHaveTextContent("₦30,000");
  });

  it("an empty bag sends you shopping", async () => {
    signedOut();
    vi.stubGlobal("fetch", api());
    renderCheckout();
    expect(await screen.findByRole("link", { name: "Find something to wear" })).toHaveAttribute("href", "/shop");
  });
});
