"use client";

import { getCountries, getCountryCallingCode, type CountryCode } from "libphonenumber-js";
import { useId, useState } from "react";
import { inputClasses, labelClasses } from "./input";

const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
const COUNTRIES = getCountries()
  .map((country) => ({
    country,
    name: displayNames.of(country) ?? country,
    callingCode: getCountryCallingCode(country),
  }))
  .sort((a, b) => a.name.localeCompare(b.name));
const COUNTRY_BY_PREFIX = [...COUNTRIES].sort(
  (a, b) => b.callingCode.length - a.callingCode.length,
);

function parsePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  const match = value.startsWith("+")
    ? COUNTRY_BY_PREFIX.find((item) => digits.startsWith(item.callingCode))
    : undefined;
  if (match) {
    const national = digits.slice(match.callingCode.length);
    return {
      country: match.country,
      national: match.country === "NG" ? national.replace(/^0/, "") : national,
    };
  }
  return { country: "NG" as CountryCode, national: digits.replace(/^0/, "") };
}

export function PhoneNumberInput({
  id,
  name,
  label,
  value,
  onChange,
  required = false,
  autoComplete = "tel-national",
  describedBy,
  invalid = false,
}: {
  id?: string;
  name: string;
  label: string;
  value: string;
  onChange: (phone: string) => void;
  required?: boolean;
  autoComplete?: string;
  describedBy?: string;
  invalid?: boolean;
}) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const parsed = parsePhone(value);
  const [selectedCountry, setSelectedCountry] = useState<CountryCode | null>(null);
  const country = selectedCountry &&
    getCountryCallingCode(selectedCountry) === getCountryCallingCode(parsed.country)
    ? selectedCountry
    : parsed.country;
  const nationalNumber = parsed.national;
  const callingCode = getCountryCallingCode(country);

  function setCountryCode(nextCountry: CountryCode) {
    setSelectedCountry(nextCountry);
    const nextCode = getCountryCallingCode(nextCountry);
    onChange(`+${nextCode}${nationalNumber}`);
  }

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={inputId} className={labelClasses}>{label}</label>
      <div className="grid min-w-0 grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)] gap-2">
        <select
          aria-label="Country calling code"
          autoComplete="country"
          value={country}
          onChange={(event) => setCountryCode(event.target.value as CountryCode)}
          className={inputClasses}
        >
          {COUNTRIES.map((item) => (
            <option key={item.country} value={item.country}>
              {item.name} (+{item.callingCode})
            </option>
          ))}
        </select>
        <input
          id={inputId}
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={autoComplete}
          required={required}
          maxLength={15 - callingCode.length}
          value={nationalNumber}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, "").slice(0, 15 - callingCode.length);
            const national = country === "NG" ? digits.replace(/^0/, "") : digits;
            onChange(`+${callingCode}${national}`);
          }}
          className={`${inputClasses} aria-[invalid=true]:border-error`}
        />
      </div>
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
