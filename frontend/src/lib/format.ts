const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

// Prices arrive from the API as integer kobo (minor units); divide by 100
// before formatting so float arithmetic never touches money (SPC-14).
export function formatNaira(kobo: number): string {
  return naira.format(kobo / 100);
}
