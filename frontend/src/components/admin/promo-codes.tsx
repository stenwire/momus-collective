"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";
import {
  type PromoCode,
  type PromoInput,
  deletePromoCode,
  fetchPromoCodes,
  nextPageParam,
  savePromoCode,
} from "@/lib/admin/api";
import { LoadMore } from "@/components/ui/load-more";
import { errorMessages } from "@/lib/auth/api";
import { formatNaira } from "@/lib/format";

const KEY = ["admin-promo-codes"];
const FIELD =
  "min-h-11 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-base text-zinc-50 focus:border-amber-400 focus:outline-none";
const BUTTON =
  "min-h-11 rounded-md border border-zinc-700 px-4 text-sm text-zinc-100 hover:border-zinc-500 disabled:opacity-60";
const expiry = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" });

// Money is typed in naira and stored in kobo (SPC-14).
const toKobo = (naira: string) => (naira.trim() === "" ? null : Math.round(Number(naira) * 100));
const toNaira = (kobo: number | null) => (kobo === null ? "" : String(kobo / 100));
const toCount = (value: string) => (value.trim() === "" ? null : Number(value));

// datetime-local works in the browser's local time; the API takes ISO.
function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function describeDiscount(p: Pick<PromoCode, "discount_type" | "discount_value">) {
  return p.discount_type === "percentage" ? `${p.discount_value}% off` : `${formatNaira(p.discount_value)} off`;
}

function statusOf(p: PromoCode) {
  if (!p.is_active) return "Inactive";
  if (p.expires_at && new Date(p.expires_at) <= new Date()) return "Expired";
  if (p.remaining_uses === 0) return "Used up";
  return "Active";
}

function Field({ label, children, id }: { label: string; children: React.ReactNode; id: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs text-zinc-400">
        {label}
      </label>
      {children}
    </div>
  );
}

function PromoForm({ promo, onDone }: { promo?: PromoCode; onDone: (message: string) => void }) {
  const queryClient = useQueryClient();
  const ids = { code: useId(), type: useId(), value: useId(), min: useId(), max: useId(), per: useId(), exp: useId() };
  const [code, setCode] = useState(promo?.code ?? "");
  const [type, setType] = useState<PromoInput["discount_type"]>(promo?.discount_type ?? "percentage");
  const [value, setValue] = useState(
    promo ? (promo.discount_type === "flat" ? toNaira(promo.discount_value) : String(promo.discount_value)) : "",
  );
  const [min, setMin] = useState(toNaira(promo?.min_order_value ?? null));
  const [max, setMax] = useState(promo?.max_uses == null ? "" : String(promo.max_uses));
  const [perUser, setPerUser] = useState(String(promo?.max_uses_per_user ?? 1));
  const [expires, setExpires] = useState(toLocalInput(promo?.expires_at ?? null));
  const [errors, setErrors] = useState<string[]>([]);
  const save = useMutation({
    mutationFn: () =>
      savePromoCode(promo?.id ?? null, {
        code,
        discount_type: type,
        discount_value: type === "flat" ? (toKobo(value) ?? 0) : Number(value),
        min_order_value: toKobo(min),
        max_uses: toCount(max),
        max_uses_per_user: Number(perUser),
        expires_at: expires ? new Date(expires).toISOString() : null,
      }),
    meta: { success: (saved: { code: string }) => (promo ? `${saved.code} saved.` : `${saved.code} created.`), label: promo ? "Saved" : "Created" },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: KEY });
      onDone(promo ? `Saved ${saved.code}.` : `Created ${saved.code}.`);
    },
    onError: (error) => setErrors(errorMessages(error)),
  });
  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        setErrors([]);
        save.mutate();
      }}
    >
      <Field label="Code" id={ids.code}>
        <input id={ids.code} required value={code} onChange={(e) => setCode(e.target.value)} className={`${FIELD} uppercase`} />
      </Field>
      <Field label="Discount type" id={ids.type}>
        <select id={ids.type} value={type} onChange={(e) => setType(e.target.value as PromoInput["discount_type"])} className={FIELD}>
          <option value="percentage">Percentage</option>
          <option value="flat">Flat amount (₦)</option>
        </select>
      </Field>
      <Field label={type === "flat" ? "Discount (₦)" : "Discount (%)"} id={ids.value}>
        <input
          id={ids.value}
          required
          type="number"
          min={type === "flat" ? 0.01 : 1}
          max={type === "percentage" ? 100 : undefined}
          step={type === "flat" ? "0.01" : "1"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={FIELD}
        />
      </Field>
      <Field label="Minimum order (₦, optional)" id={ids.min}>
        <input id={ids.min} type="number" min={0} step="0.01" value={min} onChange={(e) => setMin(e.target.value)} className={FIELD} />
      </Field>
      <Field label="Total uses (empty for unlimited)" id={ids.max}>
        <input id={ids.max} type="number" min={1} value={max} onChange={(e) => setMax(e.target.value)} className={FIELD} />
      </Field>
      <Field label="Uses per customer" id={ids.per}>
        <input id={ids.per} required type="number" min={1} value={perUser} onChange={(e) => setPerUser(e.target.value)} className={FIELD} />
      </Field>
      <Field label="Expires (optional)" id={ids.exp}>
        <input id={ids.exp} type="datetime-local" value={expires} onChange={(e) => setExpires(e.target.value)} className={FIELD} />
      </Field>
      <div className="flex items-end">
        <button type="submit" disabled={save.isPending} className="min-h-11 w-full rounded-md bg-amber-400 px-4 text-sm font-medium text-black hover:bg-amber-300 disabled:opacity-60">
          {promo ? "Save changes" : "Create code"}
        </button>
      </div>
      {errors.length ? (
        <p role="alert" className="text-sm text-red-400 sm:col-span-2">
          {errors.join(" ")}
        </p>
      ) : null}
    </form>
  );
}

function PromoRow({ promo, onDone }: { promo: PromoCode; onDone: (message: string) => void }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const refresh = () => queryClient.invalidateQueries({ queryKey: KEY });
  const toggle = useMutation({
    mutationFn: () => savePromoCode(promo.id, { is_active: !promo.is_active }),
    meta: { success: `${promo.code} is now ${promo.is_active ? "inactive" : "active"}.`, label: promo.is_active ? "Deactivated" : "Activated" },
    onSuccess: async () => {
      await refresh();
      onDone(`${promo.code} is now ${promo.is_active ? "inactive" : "active"}.`);
    },
    onError: (error) => setErrors(errorMessages(error)),
  });
  const remove = useMutation({
    mutationFn: () => deletePromoCode(promo.id),
    meta: { success: `${promo.code} deleted.`, label: "Deleted" },
    onSuccess: async () => {
      await refresh();
      onDone(`Deleted ${promo.code}.`);
    },
    onError: (error) => {
      setConfirming(false);
      setErrors(errorMessages(error));
    },
  });
  const status = statusOf(promo);
  return (
    <li className="flex flex-col gap-3 rounded-lg border border-zinc-800 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-mono text-base font-semibold text-zinc-50">{promo.code}</h2>
        <span className={`rounded-full border px-2 py-0.5 text-xs ${status === "Active" ? "border-emerald-500 text-emerald-400" : "border-zinc-600 text-zinc-400"}`}>
          {status}
        </span>
      </div>
      <p className="text-sm text-zinc-200">
        {describeDiscount(promo)}
        {promo.min_order_value ? ` on orders of ${formatNaira(promo.min_order_value)} or more` : ""}
        {promo.expires_at ? ` · ends ${expiry.format(new Date(promo.expires_at))}` : ""}
      </p>
      <dl className="grid grid-cols-3 gap-2 text-sm">
        <div>
          <dt className="text-xs text-zinc-400">Redemptions</dt>
          <dd className="text-zinc-50">{promo.redemptions}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-400">Discount given</dt>
          <dd className="text-zinc-50">{formatNaira(promo.total_discount)}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-400">Remaining</dt>
          <dd className="text-zinc-50">{promo.remaining_uses ?? "Unlimited"}</dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={BUTTON}
          onClick={() => setEditing(!editing)}
          aria-expanded={editing}
          aria-label={`${editing ? "Close" : "Edit"} ${promo.code}`}
        >
          {editing ? "Close" : "Edit"}
        </button>
        <button
          type="button"
          className={BUTTON}
          disabled={toggle.isPending}
          onClick={() => toggle.mutate()}
          aria-label={`${promo.is_active ? "Deactivate" : "Activate"} ${promo.code}`}
        >
          {promo.is_active ? "Deactivate" : "Activate"}
        </button>
        {confirming ? (
          <>
            <button type="button" className={`${BUTTON} border-red-500 text-red-400`} disabled={remove.isPending} onClick={() => remove.mutate()}>
              Confirm delete
            </button>
            <button type="button" className={BUTTON} onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </>
        ) : (
          <button type="button" className={BUTTON} onClick={() => setConfirming(true)} aria-label={`Delete ${promo.code}`}>
            Delete
          </button>
        )}
      </div>
      {editing ? <PromoForm promo={promo} onDone={(m) => { setEditing(false); onDone(m); }} /> : null}
      {errors.length ? (
        <p role="alert" className="text-sm text-red-400">
          {errors.join(" ")}
        </p>
      ) : null}
    </li>
  );
}

// FR-ADM-09: create, edit, deactivate and delete codes, with their usage.
export function PromoCodes() {
  const codes = useInfiniteQuery({
    queryKey: KEY,
    queryFn: ({ pageParam }) => fetchPromoCodes(pageParam),
    initialPageParam: 1,
    getNextPageParam: nextPageParam,
  });
  const rows = codes.data?.pages.flatMap((page) => page.results) ?? [];
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <div className="flex flex-col gap-4">
      <p aria-live="polite" className="text-sm text-emerald-400">
        {message}
      </p>
      <section aria-labelledby="new-code" className="flex flex-col gap-3 rounded-lg border border-zinc-800 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 id="new-code" className="text-base font-semibold text-zinc-50">
            New code
          </h2>
          <button type="button" className={BUTTON} aria-expanded={creating} onClick={() => setCreating(!creating)}>
            {creating ? "Close" : "Create a code"}
          </button>
        </div>
        {creating ? (
          <PromoForm
            onDone={(m) => {
              setCreating(false);
              setMessage(m);
            }}
          />
        ) : null}
      </section>
      {codes.isError ? (
        <p className="text-zinc-400">Promo codes could not load. Refresh to try again.</p>
      ) : !codes.data ? (
        <p className="text-zinc-400">Loading promo codes…</p>
      ) : rows.length === 0 ? (
        <p className="text-zinc-400">No promo codes yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((promo) => (
            <PromoRow key={promo.id} promo={promo} onDone={setMessage} />
          ))}
        </ul>
      )}
      <LoadMore hasNext={Boolean(codes.hasNextPage)} loading={codes.isFetchingNextPage} onClick={() => codes.fetchNextPage()} />
    </div>
  );
}
