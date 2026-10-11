export type Shipping = {
  full_name: string;
  phone: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  state: string;
  lga: string;
  notes: string;
};

export const EMPTY_SHIPPING: Shipping = {
  full_name: "",
  phone: "",
  address_line_1: "",
  address_line_2: "",
  city: "",
  state: "",
  lga: "",
  notes: "",
};

export type CheckoutOptions = { states: string[]; lagos_lgas: string[] };

export type SavedAddress = Omit<Shipping, "notes"> & {
  id: string;
  label: string;
  is_default: boolean;
};

const PHONE = /^\+?[0-9 ]{7,15}$/;

export function shippingErrors(s: Shipping): Partial<Record<keyof Shipping, string>> {
  const errors: Partial<Record<keyof Shipping, string>> = {};
  if (!s.full_name.trim()) errors.full_name = "Enter the recipient's full name.";
  if (!PHONE.test(s.phone.trim())) errors.phone = "Enter a phone number we can call.";
  if (!s.address_line_1.trim()) errors.address_line_1 = "Enter the delivery address.";
  if (!s.city.trim()) errors.city = "Enter the city or town.";
  if (!s.state) errors.state = "Choose a state.";
  if (!s.lga.trim()) errors.lga = "Choose or enter the LGA.";
  return errors;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emailError(email: string): string | undefined {
  return EMAIL.test(email.trim()) ? undefined : "Enter an email for your receipt and tracking link.";
}
