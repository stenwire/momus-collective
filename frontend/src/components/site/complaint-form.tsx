"use client";

import { useId, useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import { inputClasses } from "@/components/ui/input";
import { errorMessages } from "@/lib/auth/api";
import { submitComplaint, type ComplaintTopic } from "@/lib/support";
import { toast, toastError } from "@/lib/toast";

const TOPICS: { value: ComplaintTopic; label: string }[] = [
  { value: "order", label: "Order issue" },
  { value: "delivery", label: "Delivery" },
  { value: "quality", label: "Product quality" },
  { value: "payment", label: "Payment" },
  { value: "privacy", label: "Privacy or account" },
  { value: "other", label: "Other" },
];

export function ComplaintForm() {
  const ids = { email: useId(), order: useId(), subject: useId(), details: useId() };
  const [email, setEmail] = useState("");
  const [order, setOrder] = useState("");
  const [topic, setTopic] = useState<ComplaintTopic>("order");
  const [details, setDetails] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [reference, setReference] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  async function file(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors([]);
    setReference("");
    setBusy(true);
    try {
      const result = await submitComplaint({
        email: email.trim(),
        order_number: order.trim(),
        topic,
        details: details.trim(),
        website,
      });
      setReference(result.reference);
      toast(`Complaint filed. Reference ${result.reference}.`, { tone: "success", label: "Received" });
      setEmail("");
      setOrder("");
      setDetails("");
    } catch (error) {
      setErrors(errorMessages(error));
      toastError(error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={file} className="flex flex-col gap-4">
      <label aria-hidden="true" className="sr-only" htmlFor={`${ids.details}-website`}>Leave this field empty</label>
      <input id={`${ids.details}-website`} tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} className="sr-only" />
      <div className="grid gap-4 sm:grid-cols-2">
        <label htmlFor={ids.email} className="flex min-w-0 flex-col gap-1 text-sm text-bone-muted">
          Email address
          <input id={ids.email} type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClasses} />
        </label>
        <label htmlFor={ids.order} className="flex min-w-0 flex-col gap-1 text-sm text-bone-muted">
          Order number (optional)
          <input id={ids.order} value={order} onChange={(event) => setOrder(event.target.value)} className={inputClasses} />
        </label>
      </div>
      <label htmlFor={ids.subject} className="flex flex-col gap-1 text-sm text-bone-muted">
        What is this about?
        <select id={ids.subject} value={topic} onChange={(event) => setTopic(event.target.value as ComplaintTopic)} className={inputClasses}>
          {TOPICS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </label>
      <label htmlFor={ids.details} className="flex flex-col gap-1 text-sm text-bone-muted">
        Tell us what happened
        <textarea id={ids.details} required minLength={10} maxLength={3000} rows={6} value={details} onChange={(event) => setDetails(event.target.value)} className={`${inputClasses} py-2`} />
      </label>
      <p className="text-xs text-right text-bone-muted">{details.length}/3000</p>
      <button type="submit" disabled={busy} className={buttonClasses({ size: "sm" })}>
        {busy ? "Sending…" : "Send complaint"}
      </button>
      {errors.length ? <p role="alert" className="text-sm text-error">{errors.join(" ")}</p> : null}
      {reference ? (
        <p role="status" className="border-l-2 border-ok px-3 py-2 text-sm text-ok">
          Complaint received. Your reference is {reference}.
        </p>
      ) : null}
    </form>
  );
}