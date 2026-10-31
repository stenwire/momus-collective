"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { Raven } from "@/components/brand/raven";
import { Button } from "@/components/ui/button";
import { inputClasses, labelClasses } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useRemoveWithUndo } from "@/lib/cart/use-remove-with-undo";
import { cn } from "@/lib/cn";
import { haptic } from "@/lib/haptics";
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
import { buttonClasses } from "@/components/ui/button";

function Section({
  step,
  title,
  children,
}: {
  step: string;
  title: string;
  children: React.ReactNode;
}) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4 border-t border-rule pt-6">
      <h2 id={id} className="flex items-baseline gap-3 font-display text-3xl uppercase tracking-tight">
        <span aria-hidden="true" className="font-mono text-xs tracking-widest text-laurel">
          {step}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

// FR-CART-04: one page, three sections, and the cart stays editable here.
export function CheckoutPage() {
  const signedIn = useSignedIn();
  const { cart, ready, setQuantity } = useCart();
  const removeWithUndo = useRemoveWithUndo(cart);
  const formRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
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
      <p role="status" className="px-4 text-ok">
        Payment confirmed. Thank you! Reference {paidReference}.
      </p>
    );
  }
  if (!ready || !options.data) {
    return (
      <div aria-busy="true" className="grid gap-8 px-4 pb-12 md:grid-cols-[1fr_24rem]">
        <p role="status" className="sr-only">
          Loading checkout…
        </p>
        <Skeleton className="h-96" />
        <Skeleton className="h-72" />
      </div>
    );
  }
  if (cart.items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 px-4 py-12 text-center">
        <Raven className="w-28" sizes="112px" />
        <p className="text-bone-muted">
          Your bag is empty.{" "}
          <Link href="/shop" className="inline-flex min-h-11 items-center text-laurel underline underline-offset-4">
            Find something to wear
          </Link>
        </p>
      </div>
    );
  }

  const errors = touched ? shippingErrors(shipping) : {};
  const guest = signedIn === false;
  const guestEmailError = guest && touched ? emailError(email) : undefined;

  // Move focus to the first field the person needs to fix (after paint, once
  // the error states have rendered).
  function focusFirstInvalid() {
    requestAnimationFrame(() =>
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
    );
  }

  function fail(message: string) {
    haptic("error");
    setFailed(true);
    setStatus(message);
  }

  async function pay() {
    setTouched(true);
    setFailed(false);
    const invalid =
      Object.keys(shippingErrors(shipping)).length > 0 || (guest && emailError(email));
    if (!quote.data) {
      fail("Your total couldn't be worked out. Check your bag.");
      return;
    }
    if (invalid) {
      fail("Check the highlighted delivery details.");
      focusFirstInvalid();
      return;
    }
    if (quote.data.delivery_fee === null) {
      fail("Delivery is still being priced for this address. Try again in a moment.");
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
        fail(`Payment failed: ${outcome.message} You weren't charged; please try again.`);
        return;
      }
      setStatus("Confirming your payment…");
      const paid = await verifyPayment(outcome.reference);
      haptic("success");
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
      fail(errorMessages(error).join(" "));
    } finally {
      setPaying(false);
    }
  }

  return (
    <div ref={formRef} className="grid gap-8 px-4 pb-12 md:grid-cols-[1fr_24rem]">
      <Section step="01" title="Shipping information">
        {guest ? (
          <div className="flex flex-col gap-1">
            <label htmlFor={emailFieldId} className={labelClasses}>
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
              spellCheck={false}
              className={cn(inputClasses, "w-full aria-[invalid=true]:border-error")}
            />
            {guestEmailError ? (
              <span id={emailErrorId} className="text-xs text-error">
                {guestEmailError}
              </span>
            ) : (
              <p className="text-xs text-bone-muted">
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
        <Section step="02" title="Order summary">
          <CartLines cart={cart} onQuantity={setQuantity} onRemove={removeWithUndo} showTotals={false} />
          {quote.isError ? (
            <p role="alert" className="text-sm text-error">
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
              placeholder="Promo code…"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              className={cn(inputClasses, "flex-1 font-mono uppercase")}
            />
            <button type="submit" className={buttonClasses({ variant: "secondary", size: "sm" })}>
              Apply
            </button>
          </form>
          {quote.data?.promo_error ? (
            <p role="alert" className="text-sm text-error">
              {quote.data.promo_error}
            </p>
          ) : null}
          {quote.data?.promo_code ? (
            <p className="flex items-center justify-between text-sm text-ok">
              Code {quote.data.promo_code} applied
              <button
                type="button"
                onClick={() => {
                  setPromoCode("");
                  setPromoInput("");
                }}
                aria-label={`Remove code ${quote.data.promo_code}`}
                className="min-h-11 px-2 text-bone-muted underline underline-offset-4"
              >
                Remove
              </button>
            </p>
          ) : null}
          {quote.data ? (
            <dl className="grid grid-cols-2 gap-y-1 text-sm">
              <dt className="text-bone-muted">Subtotal</dt>
              <dd className="text-right font-mono tabular-nums text-bone">{formatNaira(quote.data.subtotal)}</dd>
              <dt className="text-bone-muted">Delivery</dt>
              <dd className="text-right font-mono tabular-nums text-bone">
                {quote.data.delivery_fee === null
                  ? "Add your address"
                  : quote.data.delivery_fee === 0
                    ? "Free"
                    : formatNaira(quote.data.delivery_fee)}
              </dd>
              {quote.data.discount ? (
                <>
                  <dt className="text-bone-muted">Discount</dt>
                  <dd className="text-right font-mono tabular-nums text-ok">−{formatNaira(quote.data.discount)}</dd>
                </>
              ) : null}
              <dt className="border-t border-rule pt-2 font-semibold text-bone">Total</dt>
              <dd className="border-t border-rule pt-2 text-right font-mono text-lg font-bold tabular-nums text-laurel">
                {formatNaira(quote.data.total)}
              </dd>
            </dl>
          ) : null}
        </Section>
        <Section step="03" title="Payment">
          <p className="text-sm text-bone-muted">
            Pay securely with card or bank transfer through Paystack.
          </p>
          <p className="text-sm text-bone-muted">
            Paystack&apos;s processing fee is paid by you and added in the payment window, so the
            amount there will be slightly higher than this total.
          </p>
          <Button size="lg" onClick={pay} loading={paying} disabled={paidReference !== null}>
            {quote.data ? `Pay ${formatNaira(quote.data.total)}` : "Pay now"}
          </Button>
          <p role="status" className={cn("text-sm", failed ? "text-error" : "text-bone-muted")}>
            {status}
          </p>
        </Section>
      </div>
    </div>
  );
}
