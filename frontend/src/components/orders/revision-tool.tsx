"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { fetchDesignOptions } from "@/lib/api";
import { errorMessages } from "@/lib/auth/api";
import type { DesignConfig } from "@/lib/design/types";
import { fetchTrackedOrder, submitRevision } from "@/lib/orders/api";
import { DesignControls } from "../design/design-controls";
import { ShirtCanvas } from "../design/shirt-canvas";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/cn";

// Local state on purpose: a revision never touches the saved design draft.
export function RevisionTool({ token, itemId }: { token: string; itemId: string }) {
  const router = useRouter();
  const options = useQuery({ queryKey: ["design-options"], queryFn: fetchDesignOptions });
  const order = useQuery({ queryKey: ["tracked-order", token], queryFn: () => fetchTrackedOrder(token) });
  const [draft, setDraft] = useState<DesignConfig | null>(null);
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  if (options.isError || order.isError) {
    return <p className="px-4 text-zinc-400">This page could not load. Refresh to try again.</p>;
  }
  if (!options.data || order.data === undefined) return <p className="px-4 text-zinc-400">Loading your design…</p>;
  const item = order.data?.items.find((i) => i.id === itemId);
  if (!order.data || !item?.design_config || !order.data.design_review || order.data.design_review.customer_choice) {
    return (
      <p className="px-4 text-zinc-400">
        This design isn&apos;t waiting for a revision.{" "}
        <Link href={`/track/${encodeURIComponent(token)}`} className="inline-flex min-h-11 items-center text-amber-400 underline">
          Back to your order
        </Link>
      </p>
    );
  }
  const config = draft ?? item.design_config;
  const update = (change: Partial<DesignConfig>) => setDraft({ ...config, ...change });

  return (
    <div className="flex flex-col gap-6 px-4 pb-10 md:flex-row md:items-start">
      <div className="w-full md:sticky md:top-4 md:max-w-xl md:flex-1">
        <p className="mb-3 text-sm text-zinc-300">
          Order {order.data.order_number}. Reason: {order.data.design_review.reason_label}
          {order.data.design_review.details ? `. ${order.data.design_review.details}` : ""}
        </p>
        <ShirtCanvas config={config} options={options.data} label={`Shirt mockup: ${config.text || "no text yet"}`} guide />
        <p className="mt-3 text-sm text-zinc-400">Your {config.shirt_color} shirt stays the same; the price doesn&apos;t change.</p>
        <button
          type="button"
          disabled={sending || !draft}
          onClick={async () => {
            setSending(true);
            setErrors([]);
            try {
              await submitRevision(token, itemId, config);
              router.push(`/track/${encodeURIComponent(token)}?revised=1`);
            } catch (error) {
              setErrors(errorMessages(error));
              setSending(false);
            }
          }}
          className={cn(buttonClasses({ block: true }), "mt-3")}
        >
          Send revised design
        </button>
        {errors.length ? (
          <p role="alert" className="mt-2 text-sm text-red-400">
            {errors.join(" ")}
          </p>
        ) : null}
      </div>
      <DesignControls config={config} options={options.data} update={update} lockShirtColor />
    </div>
  );
}
