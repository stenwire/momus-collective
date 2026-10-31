"use client";

import { cloneElement, isValidElement, useId } from "react";
import { inputClasses, labelClasses } from "@/components/ui/input";
import { PhoneNumberInput } from "@/components/ui/phone-number-input";
import { cn } from "@/lib/cn";
import type { CheckoutOptions, SavedAddress, Shipping } from "@/lib/checkout/types";

const FIELD = cn(inputClasses, "w-full aria-[invalid=true]:border-error");

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactElement<{ "aria-describedby"?: string }>;
}) {
  const errorId = useId();
  const control = isValidElement(children)
    ? cloneElement(children, { "aria-describedby": error ? errorId : undefined })
    : children;
  return (
    <div className="flex flex-col gap-1">
      <label className="flex flex-col gap-1">
        <span className={labelClasses}>{label}</span>
        {control}
      </label>
      {error ? (
        <span id={errorId} className="text-xs text-error">
          {error}
        </span>
      ) : null}
    </div>
  );
}

export function ShippingForm({
  value,
  onChange,
  options,
  savedAddresses,
  errors,
}: {
  value: Shipping;
  onChange: (next: Shipping) => void;
  options: CheckoutOptions;
  savedAddresses: SavedAddress[];
  errors: Partial<Record<keyof Shipping, string>>;
}) {
  const set = (patch: Partial<Shipping>) => onChange({ ...value, ...patch });
  const phoneErrorId = useId();
  const input = (key: keyof Shipping, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input
      value={value[key]}
      onChange={(e) => set({ [key]: e.target.value })}
      aria-invalid={Boolean(errors[key])}
      className={FIELD}
      {...extra}
    />
  );

  return (
    <div className="flex flex-col gap-4">
      {savedAddresses.length > 0 ? (
        <Field label="Saved addresses">
          <select
            className={FIELD}
            defaultValue=""
            onChange={(e) => {
              const a = savedAddresses.find((x) => x.id === e.target.value);
              if (a) {
                const { full_name, phone, address_line_1, address_line_2, city, state, lga } = a;
                set({ full_name, phone, address_line_1, address_line_2, city, state, lga });
              }
            }}
          >
            <option value="">Choose a saved address…</option>
            {savedAddresses.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label || a.address_line_1}
                {a.is_default ? " (default)" : ""}
              </option>
            ))}
          </select>
        </Field>
      ) : null}
      <Field label="Full name" error={errors.full_name}>
        {input("full_name", { autoComplete: "name" })}
      </Field>
      <div className="flex flex-col gap-1">
        <PhoneNumberInput
          label="Phone number"
          name="phone"
          value={value.phone || "+234"}
          onChange={(phone) => set({ phone })}
          autoComplete="tel"
          required
          invalid={Boolean(errors.phone)}
          describedBy={errors.phone ? phoneErrorId : undefined}
        />
        {errors.phone ? <span id={phoneErrorId} className="text-xs text-error">{errors.phone}</span> : null}
      </div>
      <Field label="Address" error={errors.address_line_1}>
        {input("address_line_1", { autoComplete: "address-line1" })}
      </Field>
      <Field label="Apartment, landmark (optional)">
        {input("address_line_2", { autoComplete: "address-line2" })}
      </Field>
      <Field label="City or town" error={errors.city}>
        {input("city", { autoComplete: "address-level2" })}
      </Field>
      <Field label="State" error={errors.state}>
        <select
          value={value.state}
          onChange={(e) => set({ state: e.target.value, lga: "" })}
          aria-invalid={Boolean(errors.state)}
          className={FIELD}
        >
          <option value="">Choose a state…</option>
          {options.states.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </Field>
      <Field label="LGA" error={errors.lga}>
        {value.state === "Lagos" ? (
          <select
            value={value.lga}
            onChange={(e) => set({ lga: e.target.value })}
            aria-invalid={Boolean(errors.lga)}
            className={FIELD}
          >
            <option value="">Choose an LGA…</option>
            {options.lagos_lgas.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        ) : (
          input("lga")
        )}
      </Field>
      <Field label="Delivery notes (optional)">
        <textarea
          value={value.notes}
          onChange={(e) => set({ notes: e.target.value })}
          rows={2}
          maxLength={500}
          className={`${FIELD} py-2`}
        />
      </Field>
    </div>
  );
}
