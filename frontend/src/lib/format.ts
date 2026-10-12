const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});
// Prices are whole naira; Paystack's fee can carry kobo (D-098).
const nairaKobo = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 2,
});

// Prices arrive from the API as integer kobo (minor units); divide by 100
// before formatting so float arithmetic never touches money (SPC-14).
export function formatNaira(kobo: number): string {
  return (kobo % 100 ? nairaKobo : naira).format(kobo / 100);
}
