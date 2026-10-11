"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useId, useState } from "react";
import { useSignedIn } from "@/lib/auth/use-signed-in";
import { useCart } from "@/lib/cart/use-cart";
import { fetchCheckoutOptions, fetchSavedAddresses } from "@/lib/checkout/api";
import {
  EMPTY_SHIPPING,
  emailError,
  type Shipping,
  shippingErrors,
} from "@/lib/checkout/types";
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
  const [shipping, setShipping] = useState<Shipping>(EMPTY_SHIPPING);
  // FR-CART-05: a guest gives an email; the phone comes from shipping.
  const [email, setEmail] = useState("");
  const emailFieldId = useId();
  const emailErrorId = useId();
  const [touched, setTouched] = useState(false);
  const [status, setStatus] = useState("");

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

  function pay() {
    setTouched(true);
    const invalid =
      Object.keys(shippingErrors(shipping)).length > 0 || (guest && emailError(email));
    if (invalid) {
      setStatus("Check the highlighted delivery details.");
      return;
    }
    setStatus("Payment isn't connected yet.");
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
          <CartLines cart={cart} onQuantity={setQuantity} onRemove={remove} />
        </Section>
        <Section title="Payment">
          <p className="text-sm text-zinc-400">
            Pay securely with card, bank transfer or USSD through Paystack.
          </p>
          <button
            type="button"
            onClick={pay}
            className="min-h-11 rounded-md bg-amber-400 px-6 font-medium text-black hover:bg-amber-300"
          >
            Pay now
          </button>
          <p role="status" className="text-sm text-amber-300">
            {status}
          </p>
        </Section>
      </div>
    </div>
  );
}
