"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import { inputClasses } from "@/components/ui/input";
import { type DesignPricing, fetchDesignPricingAdmin, saveDesignPricing } from "@/lib/admin/api";
import { errorMessages } from "@/lib/auth/api";

const naira = (kobo: number) => String(kobo / 100);
const kobo = (value: string) => Math.round(Number(value) * 100);

function PricingForm({ pricing }: { pricing: DesignPricing }) {
  const queryClient = useQueryClient();
  const [printCost, setPrintCost] = useState(naira(pricing.print_cost));
  const [margin, setMargin] = useState(naira(pricing.margin));
  const [blanks, setBlanks] = useState(
    Object.fromEntries(Object.entries(pricing.blank_costs).map(([color, cost]) => [color, naira(cost)])),
  );
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const save = useMutation({
    mutationFn: saveDesignPricing,
    meta: { success: "Pricing saved.", label: "Saved" },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-design-pricing"] });
      await queryClient.invalidateQueries({ queryKey: ["design-pricing"] });
      setMessage("Pricing saved.");
    },
    onError: (error) => setErrors(errorMessages(error)),
  });
  const field = (label: string, value: string, onChange: (value: string) => void) => (
    <label key={label} className="flex flex-col gap-1 text-sm text-bone-muted">
      {label}
      <input type="number" min="0" step="0.01" required value={value} onChange={(e) => onChange(e.target.value)} className={inputClasses} />
    </label>
  );
  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        setMessage("");
        setErrors([]);
        save.mutate({
          print_cost: kobo(printCost),
          margin: kobo(margin),
          blank_costs: Object.fromEntries(Object.entries(blanks).map(([color, value]) => [color, kobo(value)])),
        });
      }}
    >
      {field("Print cost (₦)", printCost, setPrintCost)}
      {field("Margin (₦)", margin, setMargin)}
      {Object.entries(blanks).map(([color, value]) =>
        field(`${color} blank cost (₦)`, value, (next) => setBlanks((current) => ({ ...current, [color]: next }))),
      )}
      {message ? <p role="status" className="text-sm text-ok sm:col-span-2">{message}</p> : null}
      {errors.length ? <p role="alert" className="text-sm text-error sm:col-span-2">{errors.join(" ")}</p> : null}
      <div className="sm:col-span-2">
        <button type="submit" disabled={save.isPending} className={buttonClasses({ size: "sm" })}>
          <Save className="size-4" aria-hidden="true" /> {save.isPending ? "Saving…" : "Save pricing"}
        </button>
      </div>
    </form>
  );
}

export function AdminDesignPricing() {
  const pricing = useQuery({ queryKey: ["admin-design-pricing"], queryFn: fetchDesignPricingAdmin });
  if (pricing.isError) return <p role="alert" className="text-error">Pricing could not load. Refresh to try again.</p>;
  if (!pricing.data) return <p role="status" className="text-sm text-bone-muted">Loading pricing…</p>;
  return <PricingForm pricing={pricing.data} />;
}
