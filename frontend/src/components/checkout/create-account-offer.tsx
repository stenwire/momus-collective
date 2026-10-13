import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";

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
        className={buttonClasses({ block: true })}
      >
        Create my account
      </Link>
    </section>
  );
}
