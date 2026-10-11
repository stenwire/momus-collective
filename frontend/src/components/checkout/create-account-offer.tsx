import Link from "next/link";

export type GuestDetails = {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
};

// FR-CART-05: after a guest pays, offer an account with their details in.
export function CreateAccountOffer({ details }: { details: GuestDetails }) {
  const query = new URLSearchParams({ ...details, next: "/account/designs" });
  return (
    <section
      aria-label="Create an account"
      className="flex flex-col gap-3 rounded-lg border border-zinc-700 p-4"
    >
      <p className="text-sm text-zinc-300">
        Want to track this order and check out faster next time? Create an account
        with these details already filled in.
      </p>
      <Link
        href={`/register?${query}`}
        className="flex min-h-11 items-center justify-center rounded-md bg-amber-400 px-6 font-medium text-black hover:bg-amber-300"
      >
        Create my account
      </Link>
    </section>
  );
}
