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

const serverQuote = {
  lines: [],
  subtotal: 1500000,
  delivery_fee: 0,
  delivery_band: null,
  discount: 0,
  promo_code: null,
  promo_error: null,
  total: 1500000,
  notes: [],
};

function api(serverCart?: unknown, quote: unknown = serverQuote, quoteStatus = 200) {
  return vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async (url) => {
    if (url.includes("/checkout/options/")) return json(options);
    if (url.includes("/checkout/quote/"))
      return { ok: quoteStatus < 400, status: quoteStatus, json: async () => quote } as Response;
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
    await userEvent.click(await screen.findByRole("button", { name: /^Pay/ }));
    expect(screen.getByRole("status")).toHaveTextContent("Check the highlighted delivery details.");
    expect(screen.getByText("Enter the recipient's full name.")).toBeInTheDocument();
    const name = screen.getByLabelText("Full name");
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(name).toHaveAccessibleDescription("Enter the recipient's full name.");
  });

  it("edits the cart from checkout and re-quotes the total", async () => {
    signedOut();
    useGuestCart.getState().add({ product, size: "M", color: "Black", quantity: 1 });
    const fetchMock = api();
    vi.stubGlobal("fetch", fetchMock);
    renderCheckout();
    const summary = await screen.findByRole("region", { name: "Order summary" });
    await userEvent.click(within(summary).getByRole("button", { name: "Increase quantity of touch grass" }));
    expect(useGuestCart.getState().lines[0].quantity).toBe(2);
    expect(within(summary).getByLabelText("Quantity of touch grass")).toHaveTextContent("2");
    await vi.waitFor(() => {
      const quotes = fetchMock.mock.calls.filter(([url]) => String(url).includes("/checkout/quote/"));
      const last = JSON.parse(quotes[quotes.length - 1][1]!.body as string);
      expect(last.items[0].quantity).toBe(2);
    });
  });

  it("an empty bag sends you shopping", async () => {
    signedOut();
    vi.stubGlobal("fetch", api());
    renderCheckout();
    expect(await screen.findByRole("link", { name: "Find something to wear" })).toHaveAttribute("href", "/shop");
  });

  it("asks a guest for an email and checks it before paying", async () => {
    signedOut();
    useGuestCart.getState().add({ product, size: "M", color: "Black", quantity: 1 });
    vi.stubGlobal("fetch", api());
    renderCheckout();
    const email = await screen.findByLabelText("Email");
    await userEvent.click(screen.getByRole("button", { name: /^Pay/ }));
    expect(email).toHaveAccessibleDescription("Enter an email for your receipt and tracking link.");
    await userEvent.type(email, "guest@example.com");
    expect(email).toHaveAttribute("aria-invalid", "false");
  });

  it("does not ask a signed-in customer for an email", async () => {
    signedIn();
    vi.stubGlobal(
      "fetch",
      api({
        items: [
          { id: "l1", kind: "product", product, design: null, size: "M", color: "Black", quantity: 1, unit_price: 1500000, line_total: 1500000 },
        ],
        item_count: 1,
        subtotal: 1500000,
      }),
    );
    renderCheckout();
    await screen.findByLabelText("Full name");
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
  });

  it("shows the server's totals and puts the total on the pay button", async () => {
    signedOut();
    useGuestCart.getState().add({ product: { ...product, price: 1 }, size: "M", color: "Black", quantity: 1 });
    const fetchMock = api(undefined, { ...serverQuote, subtotal: 1500000, total: 1500000 });
    vi.stubGlobal("fetch", fetchMock);
    renderCheckout();
    expect(await screen.findByRole("button", { name: "Pay ₦15,000" })).toBeInTheDocument();
    const quoteCall = fetchMock.mock.calls.find(([url]) => String(url).includes("/checkout/quote/"))!;
    const sent = JSON.parse(quoteCall[1]!.body as string);
    expect(sent).toEqual({
      items: [{ product: "p1", size: "M", color: "Black", quantity: 1 }],
      email: "",
    });
  });

  it("surfaces a refused quote, such as an archived product", async () => {
    signedOut();
    useGuestCart.getState().add({ product, size: "M", color: "Black", quantity: 1 });
    vi.stubGlobal(
      "fetch",
      api(undefined, { items: "“touch grass” is no longer available. Remove it to continue." }, 400),
    );
    renderCheckout();
    expect(await screen.findByRole("alert")).toHaveTextContent("is no longer available");
  });

  it("prices delivery once the address has a state and Lagos LGA", async () => {
    signedOut();
    useGuestCart.getState().add({ product, size: "M", color: "Black", quantity: 1 });
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async (url, init) => {
      if (url.includes("/checkout/options/")) return json(options);
      if (url.includes("/checkout/quote/")) {
        const body = JSON.parse(init!.body as string);
        const fee = body.shipping ? 300000 : null;
        return json({ ...serverQuote, delivery_fee: fee, total: 1500000 + (fee ?? 0) });
      }
      return json({});
    });
    vi.stubGlobal("fetch", fetchMock);
    renderCheckout();
    expect(await screen.findByText("Add your address")).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("State"), "Lagos");
    await userEvent.selectOptions(screen.getByLabelText("LGA"), "Eti-Osa");
    expect(await screen.findByRole("button", { name: "Pay ₦18,000" })).toBeInTheDocument();
    const quotes = fetchMock.mock.calls.filter(([url]) => url.includes("/checkout/quote/"));
    expect(JSON.parse(quotes[quotes.length - 1][1]!.body as string).shipping).toEqual({
      state: "Lagos",
      lga: "Eti-Osa",
    });
  });

  it("applies a promo code, shows the discount, and can remove it", async () => {
    signedOut();
    useGuestCart.getState().add({ product, size: "M", color: "Black", quantity: 1 });
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async (url, init) => {
      if (url.includes("/checkout/options/")) return json(options);
      if (url.includes("/checkout/quote/")) {
        const code = JSON.parse(init!.body as string).promo_code?.toUpperCase();
        if (code === "BAD") return json({ ...serverQuote, promo_error: "This code has expired." });
        if (code) return json({ ...serverQuote, discount: 300000, promo_code: "NAPS20", total: 1200000 });
        return json(serverQuote);
      }
      return json({});
    });
    vi.stubGlobal("fetch", fetchMock);
    renderCheckout();
    const field = await screen.findByLabelText("Promo code");
    await userEvent.type(field, "bad");
    await userEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(await screen.findByText("This code has expired.")).toBeInTheDocument();
    await userEvent.clear(field);
    await userEvent.type(field, "naps20");
    await userEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(await screen.findByText("Code NAPS20 applied")).toBeInTheDocument();
    expect(screen.getByText("Discount").nextSibling).toHaveTextContent("−₦3,000");
    expect(screen.getByRole("button", { name: "Pay ₦12,000" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Remove code NAPS20" }));
    expect(await screen.findByRole("button", { name: "Pay ₦15,000" })).toBeInTheDocument();
  });
});
