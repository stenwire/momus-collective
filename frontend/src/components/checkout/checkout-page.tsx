"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { errorMessages } from "@/lib/auth/api";
import { useSignedIn } from "@/lib/auth/use-signed-in";
import { useGuestCart } from "@/lib/cart/guest-store";
import { useCart } from "@/lib/cart/use-cart";
import {
  fetchCheckoutOptions,
  fetchQuote,
  fetchSavedAddresses,
  guestItems,
} from "@/lib/checkout/api";
import {
  EMPTY_SHIPPING,
  emailError,
  type Shipping,
  shippingErrors,
} from "@/lib/checkout/types";
import { saveGuestDetails } from "@/lib/checkout/guest-details";
import { cancelCheckout, openPaystack, startCheckout, verifyPayment } from "@/lib/checkout/paystack";
import { formatNaira } from "@/lib/format";
import { CartLines } from "../cart/cart-lines";
import { ShippingForm } from "./shipping-form";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <h2 id={id} className="text-lg font-semibold text-zinc-50">
        {title}
      </h2>
      {children}
    </section>
  );
}

// FR-CART-04: one page, three sections, and the cart stays editable here.
export function CheckoutPage() {
  const signedIn = useSignedIn();
  const { cart, ready, setQuantity, remove } = useCart();
  const options = useQuery({ queryKey: ["checkout-options"], queryFn: fetchCheckoutOptions });
  const addresses = useQuery({
    queryKey: ["addresses"],
    queryFn: fetchSavedAddresses,
    enabled: signedIn === true,
  });
  const guestLines = useGuestCart((s) => s.lines);
  const [shipping, setShipping] = useState<Shipping>(EMPTY_SHIPPING);
  // FR-CART-05: a guest gives an email; the phone comes from shipping.
  const [email, setEmail] = useState("");
  const emailFieldId = useId();
  const emailErrorId = useId();
  const promoFieldId = useId();
  const [touched, setTouched] = useState(false);
  const [status, setStatus] = useState("");
  const [promoInput, setPromoInput] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [paying, setPaying] = useState(false);
  const [paidReference, setPaidReference] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const router = useRouter();
  // The server's numbers are the only ones shown or charged (SEC-06).
  // The delivery band needs a state, and in Lagos an LGA too.
  const area =
    shipping.state && (shipping.state !== "Lagos" || shipping.lga)
      ? { state: shipping.state, lga: shipping.lga }
      : undefined;
  const quoteBody = {
    ...(signedIn ? {} : { items: guestItems(guestLines), email: email.trim() }),
    ...(area ? { shipping: area } : {}),
    ...(promoCode ? { promo_code: promoCode } : {}),
  };
  const quote = useQuery({
    queryKey: ["checkout-quote", signedIn, quoteBody, cart.item_count, cart.subtotal],
    queryFn: () => fetchQuote(quoteBody),
    enabled: ready && cart.items.length > 0,
    retry: false,
  });

  if (paidReference) {
    return (
      <p role="status" className="px-4 text-emerald-400">
        Payment confirmed. Thank you! Reference {paidReference}.
      </p>
    );
  }
  if (!ready || !options.data) {
    return <p className="px-4 text-zinc-400">Loading checkout…</p>;
  }
  if (cart.items.length === 0) {
    return (
      <p className="px-4 text-zinc-400">
        Your bag is empty.{" "}
        <Link href="/shop" className="inline-flex min-h-11 items-center text-amber-400 underline">
          Find something to wear
        </Link>
      </p>
    );
  }

  const errors = touched ? shippingErrors(shipping) : {};
  const guest = signedIn === false;
  const guestEmailError = guest && touched ? emailError(email) : undefined;

  async function pay() {
    setTouched(true);
    const invalid =
      Object.keys(shippingErrors(shipping)).length > 0 || (guest && emailError(email));
    if (!quote.data) {
      setStatus("Your total couldn't be worked out. Check your bag.");
      return;
    }
    if (invalid) {
      setStatus("Check the highlighted delivery details.");
      return;
    }
    if (quote.data.delivery_fee === null) {
      setStatus("Delivery is still being priced for this address. Try again in a moment.");
      return;
    }
    setPaying(true);
    setStatus("Opening secure payment…");
    try {
      // Each attempt is a fresh server session, so a retry is always allowed.
      const session = await startCheckout({
        ...(guest ? { items: guestItems(guestLines), email: email.trim() } : {}),
        shipping,
        ...(promoCode ? { promo_code: promoCode } : {}),
      });
      const outcome = await openPaystack(session);
      if (outcome.kind !== "success") void cancelCheckout(session.reference);
      if (outcome.kind === "cancelled") {
        setStatus("Payment cancelled. You weren't charged; try again whenever you're ready.");
        return;
      }
      if (outcome.kind === "error") {
        setStatus(`Payment failed: ${outcome.message} You weren't charged; please try again.`);
        return;
      }
      setStatus("Confirming your payment…");
      const paid = await verifyPayment(outcome.reference);
      setPaidReference(outcome.reference);
      if (guest) {
        const [first_name, ...rest] = shipping.full_name.trim().split(/\s+/);
        saveGuestDetails({ email: email.trim(), first_name, last_name: rest.join(" "), phone: shipping.phone });
      }
      useGuestCart.getState().clear();
      await queryClient.invalidateQueries({ queryKey: ["cart"] });
      setStatus("Payment confirmed. Thank you!");
      if (paid.tracking_token) router.replace(`/checkout/confirmation/${paid.tracking_token}`);
    } catch (error) {
      setStatus(errorMessages(error).join(" "));
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="grid gap-8 px-4 pb-12 md:grid-cols-[1fr_24rem]">
      <Section title="Shipping information">
        {guest ? (
          <div className="flex flex-col gap-1">
            <label htmlFor={emailFieldId} className="text-sm font-medium text-zinc-300">
              Email
            </label>
            <input
              id={emailFieldId}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(guestEmailError)}
              aria-describedby={guestEmailError ? emailErrorId : undefined}
              className="min-h-11 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-base text-zinc-50 focus:border-amber-400 focus:outline-none"
            />
            {guestEmailError ? (
              <span id={emailErrorId} className="text-xs text-red-400">
                {guestEmailError}
              </span>
            ) : (
              <p className="text-xs text-zinc-400">
                No account needed. Your receipt and tracking link go here.
              </p>
            )}
          </div>
        ) : null}
        <ShippingForm
          value={shipping}
          onChange={setShipping}
          options={options.data}
          savedAddresses={addresses.data ?? []}
          errors={errors}
        />
      </Section>
      <div className="flex flex-col gap-8">
        <Section title="Order summary">
          <CartLines cart={cart} onQuantity={setQuantity} onRemove={remove} showTotals={false} />
          {quote.isError ? (
            <p role="alert" className="text-sm text-red-400">
              {errorMessages(quote.error).join(" ")}
            </p>
          ) : null}
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setPromoCode(promoInput.trim());
            }}
          >
            <label className="sr-only" htmlFor={promoFieldId}>
              Promo code
            </label>
            <input
              id={promoFieldId}
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value)}
              placeholder="Promo code"
              autoCapitalize="characters"
              className="min-h-11 min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-base uppercase text-zinc-50 focus:border-amber-400 focus:outline-none"
            />
            <button
              type="submit"
              className="min-h-11 rounded-md border border-zinc-600 px-4 text-sm text-zinc-100 hover:border-zinc-400"
            >
              Apply
            </button>
          </form>
          {quote.data?.promo_error ? (
            <p role="alert" className="text-sm text-red-400">
              {quote.data.promo_error}
            </p>
          ) : null}
          {quote.data?.promo_code ? (
            <p className="flex items-center justify-between text-sm text-emerald-400">
              Code {quote.data.promo_code} applied
              <button
                type="button"
                onClick={() => {
                  setPromoCode("");
                  setPromoInput("");
                }}
                aria-label={`Remove code ${quote.data.promo_code}`}
                className="min-h-11 px-2 text-zinc-400 underline"
              >
                Remove
              </button>
            </p>
          ) : null}
          {quote.data ? (
            <dl className="grid grid-cols-2 gap-y-1 text-sm">
              <dt className="text-zinc-400">Subtotal</dt>
              <dd className="text-right text-zinc-50">{formatNaira(quote.data.subtotal)}</dd>
              <dt className="text-zinc-400">Delivery</dt>
              <dd className="text-right text-zinc-50">
                {quote.data.delivery_fee === null
                  ? "Add your address"
                  : quote.data.delivery_fee === 0
                    ? "Free"
                    : formatNaira(quote.data.delivery_fee)}
              </dd>
              {quote.data.discount ? (
                <>
                  <dt className="text-zinc-400">Discount</dt>
                  <dd className="text-right text-emerald-400">−{formatNaira(quote.data.discount)}</dd>
                </>
              ) : null}
              <dt className="font-semibold text-zinc-50">Total</dt>
              <dd className="text-right font-semibold text-amber-400">{formatNaira(quote.data.total)}</dd>
            </dl>
          ) : null}
        </Section>
        <Section title="Payment">
          <p className="text-sm text-zinc-400">
            Pay securely with card, bank transfer or USSD through Paystack.
          </p>
          <button
            type="button"
            onClick={pay}
            disabled={paying || paidReference !== null}
            className="min-h-11 rounded-md bg-amber-400 px-6 font-medium text-black hover:bg-amber-300 disabled:opacity-60"
          >
            {quote.data ? `Pay ${formatNaira(quote.data.total)}` : "Pay now"}
          </button>
          <p role="status" className="text-sm text-amber-300">
            {status}
          </p>
        </Section>
      </div>
    </div>
  );
}
