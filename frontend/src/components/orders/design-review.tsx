"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { errorMessages } from "@/lib/auth/api";
import { requestRefund } from "@/lib/orders/api";
import type { Order } from "@/lib/orders/types";
import { buttonClasses } from "@/components/ui/button";
import { toast, toastError } from "@/lib/toast";

// FR-NOT-03: a rejected design can be revised or refunded from here.
export function DesignReview({ order, token }: { order: Order; token: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const review = order.design_review;
  if (!review) return null;
  const designs = order.items.filter((item) => item.kind === "design");
  const refunding = review.customer_choice === "refund";

  return (
    <section
      id="design-review"
      aria-labelledby="design-review-heading"
      className="flex flex-col gap-3 border border-laurel/60 p-4"
    >
      <h2 id="design-review-heading" className="text-lg font-semibold text-bone">
        We can&apos;t print your design as it is
      </h2>
      <p className="text-sm text-bone">
        <span className="font-medium">Reason:</span> {review.reason_label}
      </p>
      {review.details ? <p className="text-sm text-bone-muted">{review.details}</p> : null}
      {refunding ? (
        <p role="status" className="text-sm text-ok">
          You asked for a refund. We&apos;ll refund your payment and email you when it&apos;s done.
        </p>
      ) : (
        <>
          <p className="text-sm text-bone-muted">Revise your design and send it back, or ask for a full refund.</p>
          <div className="flex flex-wrap gap-2">
            {designs.map((item, i) => (
              <Link
                key={item.id}
                href={`/track/${encodeURIComponent(token)}/revise/${item.id}`}
                className={buttonClasses({ size: "sm" })}
              >
                {designs.length > 1 ? `Revise design ${i + 1}` : "Revise my design"}
              </Link>
            ))}
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setErrors([]);
                try {
                  await requestRefund(token);
                  toast("Refund requested. We'll be in touch shortly.", { tone: "success", label: "Requested" });
                  router.refresh();
                } catch (error) {
                  setErrors(errorMessages(error));
                  toastError(error);
                } finally {
                  setBusy(false);
                }
              }}
              className="min-h-11 border border-rule px-4 text-sm text-bone hover:border-bone-muted disabled:opacity-60"
            >
              Request a refund
            </button>
          </div>
        </>
      )}
      {errors.length ? (
        <p role="alert" className="text-sm text-error">
          {errors.join(" ")}
        </p>
      ) : null}
    </section>
  );
}
