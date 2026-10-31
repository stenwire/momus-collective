"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, MapPin, Pencil, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PhoneNumberInput } from "@/components/ui/phone-number-input";
import { inputClasses } from "@/components/ui/input";
import { changePassword, fetchAccountSettings, requestEmailChange, updateAccountSettings, type AccountSettings } from "@/lib/account";
import { errorMessages } from "@/lib/auth/api";
import { deleteAddress, fetchCheckoutOptions, fetchSavedAddresses, saveAddress, setDefaultAddress, type SavedAddressInput } from "@/lib/checkout/api";
import type { SavedAddress } from "@/lib/checkout/types";
import { useAuthStore } from "@/lib/auth/store";
import { useSignedIn } from "@/lib/auth/use-signed-in";
import { toast } from "@/lib/toast";

const ACTION = buttonClasses({ variant: "secondary", size: "sm" });
const PREFS = [
  { value: "email", label: "Email" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "both", label: "Email and WhatsApp" },
] as const;

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <label htmlFor={id} className="flex min-w-0 flex-col gap-1 text-sm text-bone-muted">
      {label}
      {children}
    </label>
  );
}

function PersonalDetailsForm({ user, pending, onSave }: { user: AccountSettings; pending: boolean; onSave: (body: Parameters<typeof updateAccountSettings>[0]) => void }) {
  const [phone, setPhone] = useState(user.phone);
  return (
    <form className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      onSave({
        first_name: String(form.get("first_name")),
        last_name: String(form.get("last_name")),
        phone,
        notification_pref: String(form.get("notification_pref")) as AccountSettings["notification_pref"],
      });
    }}>
      <Field id="account-first-name" label="First name">
        <input id="account-first-name" name="first_name" required defaultValue={user.first_name} className={inputClasses} />
      </Field>
      <Field id="account-last-name" label="Last name">
        <input id="account-last-name" name="last_name" defaultValue={user.last_name} className={inputClasses} />
      </Field>
      <p className="flex min-w-0 flex-col gap-1 text-sm text-bone-muted">
        Email address
        <span className="inline-flex min-h-11 items-center border border-rule bg-ink px-3 text-bone">{user.email}</span>
      </p>
      <PhoneNumberInput label="Phone" name="phone" value={phone} onChange={setPhone} required />
      <Field id="account-notification-pref" label="Order updates">
        <select id="account-notification-pref" name="notification_pref" defaultValue={user.notification_pref} className={inputClasses}>
          {PREFS.map((pref) => <option key={pref.value} value={pref.value}>{pref.label}</option>)}
        </select>
      </Field>
      <div className="flex items-end">
        <button type="submit" disabled={pending} className={buttonClasses({ size: "sm" })}>
          <Check className="size-4" aria-hidden="true" /> {pending ? "Saving…" : "Save details"}
        </button>
      </div>
    </form>
  );
}

function PersonalDetails() {
  const queryClient = useQueryClient();
  const account = useQuery({ queryKey: ["account-settings"], queryFn: fetchAccountSettings });
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const update = useMutation({
    mutationFn: updateAccountSettings,
    meta: { success: "Personal details saved.", label: "Saved" },
    onSuccess: async (data) => {
      queryClient.setQueryData(["account-settings"], data);
      useAuthStore.setState({ user: { ...useAuthStore.getState().user!, first_name: data.first_name } });
      setMessage("Personal details saved.");
      setErrors([]);
    },
    onError: (error) => setErrors(errorMessages(error)),
  });
  const changeEmail = useMutation({
    mutationFn: requestEmailChange,
    meta: { success: (data: { detail: string }) => data.detail, label: "Check your inbox" },
    onSuccess: (data) => {
      setMessage(data.detail);
      setEmail("");
      setErrors([]);
    },
    onError: (error) => setErrors(errorMessages(error)),
  });

  if (account.isError) return <p role="alert" className="text-error">Account details could not load.</p>;
  if (!account.data) return <p role="status" className="text-sm text-bone-muted">Loading account…</p>;
  const user = account.data;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 border-b border-rule pb-6" aria-labelledby="personal-details">
        <div>
          <h2 id="personal-details" className="text-lg font-semibold text-bone">Personal details</h2>
          <p className="text-sm text-bone-muted">Used for your account and order updates.</p>
        </div>
        <PersonalDetailsForm key={user.id} user={user} pending={update.isPending} onSave={(body) => {
          setMessage("");
          setErrors([]);
          update.mutate(body);
        }} />
      </section>

      <section className="grid gap-6 border-b border-rule pb-6 md:grid-cols-2">
        <form className="flex min-w-0 flex-col gap-3" onSubmit={(event) => {
          event.preventDefault();
          setMessage("");
          changeEmail.mutate(email.trim());
        }}>
          <div>
            <h2 className="text-base font-semibold text-bone">Change email</h2>
            <p className="text-sm text-bone-muted">We’ll send a confirmation link to the new address.</p>
          </div>
          <Field id="account-new-email" label="New email address">
            <input id="account-new-email" required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClasses} />
          </Field>
          <button type="submit" disabled={changeEmail.isPending} className={ACTION}>
            {changeEmail.isPending ? "Sending…" : "Send confirmation"}
          </button>
        </form>
        <PasswordChange onMessage={setMessage} onError={setErrors} />
      </section>
      {message ? <p role="status" className="text-sm text-ok">{message}</p> : null}
      {errors.length ? <p role="alert" className="text-sm text-error">{errors.join(" ")}</p> : null}
    </div>
  );
}

function PasswordChange({ onMessage, onError }: { onMessage: (message: string) => void; onError: (errors: string[]) => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pending, setPending] = useState(false);
  const ids = { current: useId(), next: useId() };
  return (
    <form className="flex min-w-0 flex-col gap-3" onSubmit={async (event) => {
      event.preventDefault();
      setPending(true);
      onError([]);
      try {
        const result = await changePassword(currentPassword, newPassword);
        onMessage(result.detail);
        toast(result.detail, { tone: "success", label: "Password changed" });
        setCurrentPassword("");
        setNewPassword("");
      } catch (error) {
        onError(errorMessages(error));
      } finally {
        setPending(false);
      }
    }}>
      <div>
        <h2 className="text-base font-semibold text-bone">Change password</h2>
        <p className="text-sm text-bone-muted">Use at least 8 characters.</p>
      </div>
      <Field id={ids.current} label="Current password">
        <input id={ids.current} required type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className={inputClasses} />
      </Field>
      <Field id={ids.next} label="New password">
        <input id={ids.next} required minLength={8} type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className={inputClasses} />
      </Field>
      <button type="submit" disabled={pending} className={ACTION}>{pending ? "Updating…" : "Update password"}</button>
    </form>
  );
}

function AddressForm({
  address,
  states,
  lagosLgas,
  onSave,
  onCancel,
  pending,
}: {
  address?: SavedAddress;
  states: string[];
  lagosLgas: string[];
  onSave: (body: SavedAddressInput) => void;
  onCancel: () => void;
  pending: boolean;
}) {
  const [phone, setPhone] = useState(address?.phone ?? "+234");
  const [state, setState] = useState(address?.state ?? "");
  const [lga, setLga] = useState(address?.lga ?? "");
  const [fullName, setFullName] = useState(address?.full_name ?? "");
  const [label, setLabel] = useState(address?.label ?? "");
  const [line1, setLine1] = useState(address?.address_line_1 ?? "");
  const [line2, setLine2] = useState(address?.address_line_2 ?? "");
  const [city, setCity] = useState(address?.city ?? "");
  const [isDefault, setIsDefault] = useState(address?.is_default ?? false);
  const ids = { fullName: useId(), label: useId(), line1: useId(), line2: useId(), city: useId(), state: useId(), lga: useId() };

  return (
    <form aria-label={address ? "Edit saved address" : "New saved address"} className="grid gap-3 border-y border-rule py-4 sm:grid-cols-2" onSubmit={(event) => {
      event.preventDefault();
      onSave({ label, full_name: fullName, phone, address_line_1: line1, address_line_2: line2, city, state, lga, is_default: isDefault });
    }}>
      <Field id={ids.label} label="Address label"><input id={ids.label} value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Home, work…" className={inputClasses} /></Field>
      <Field id={ids.fullName} label="Full name"><input id={ids.fullName} required value={fullName} onChange={(event) => setFullName(event.target.value)} className={inputClasses} /></Field>
      <PhoneNumberInput label="Phone number" name="phone" value={phone} onChange={setPhone} required />
      <Field id={ids.line1} label="Address"><input id={ids.line1} required value={line1} onChange={(event) => setLine1(event.target.value)} className={inputClasses} /></Field>
      <Field id={ids.line2} label="Apartment or landmark"><input id={ids.line2} value={line2} onChange={(event) => setLine2(event.target.value)} className={inputClasses} /></Field>
      <Field id={ids.city} label="City or town"><input id={ids.city} required value={city} onChange={(event) => setCity(event.target.value)} className={inputClasses} /></Field>
      <Field id={ids.state} label="State">
        <select id={ids.state} required value={state} onChange={(event) => { setState(event.target.value); setLga(""); }} className={inputClasses}>
          <option value="">Choose a state…</option>
          {states.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </Field>
      <Field id={ids.lga} label="LGA">
        {state === "Lagos" ? (
          <select id={ids.lga} required value={lga} onChange={(event) => setLga(event.target.value)} className={inputClasses}>
            <option value="">Choose an LGA…</option>
            {lagosLgas.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        ) : (
          <input id={ids.lga} required value={lga} onChange={(event) => setLga(event.target.value)} className={inputClasses} />
        )}
      </Field>
      <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm text-bone sm:col-span-2">
        <input type="checkbox" checked={isDefault} onChange={(event) => setIsDefault(event.target.checked)} /> Make this my default address
      </label>
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <button type="submit" disabled={pending} className={buttonClasses({ size: "sm" })}>{pending ? "Saving…" : address ? "Save address" : "Add address"}</button>
        <button type="button" onClick={onCancel} className={ACTION}><X className="size-4" aria-hidden="true" /> Cancel</button>
      </div>
    </form>
  );
}

function AddressManager() {
  const client = useQueryClient();
  const addresses = useQuery({ queryKey: ["addresses"], queryFn: fetchSavedAddresses });
  const options = useQuery({ queryKey: ["checkout-options"], queryFn: fetchCheckoutOptions });
  const [editing, setEditing] = useState<SavedAddress | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const save = useMutation({
    mutationFn: ({ id, body }: { id: string | null; body: SavedAddressInput }) => saveAddress(id, body),
    meta: { success: "Address saved.", label: "Saved" },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["addresses"] });
      setCreating(false);
      setEditing(null);
      setError("");
    },
    onError: (reason) => setError(errorMessages(reason).join(" ")),
  });
  const remove = useMutation({
    mutationFn: deleteAddress,
    meta: { success: "Address removed.", label: "Deleted" },
    onSuccess: () => client.invalidateQueries({ queryKey: ["addresses"] }),
    onError: (reason) => setError(errorMessages(reason).join(" ")),
  });
  const makeDefault = useMutation({
    mutationFn: setDefaultAddress,
    meta: { success: "Default address updated.", label: "Updated" },
    onSuccess: () => client.invalidateQueries({ queryKey: ["addresses"] }),
    onError: (reason) => setError(errorMessages(reason).join(" ")),
  });

  if (addresses.isError || options.isError) return <p role="alert" className="text-error">Saved addresses could not load.</p>;
  if (!addresses.data || !options.data) return <p role="status" className="text-sm text-bone-muted">Loading saved addresses…</p>;
  const formProps = { states: options.data.states, lagosLgas: options.data.lagos_lgas, pending: save.isPending, onCancel: () => { setCreating(false); setEditing(null); } };

  return (
    <section className="flex flex-col gap-4" aria-labelledby="saved-addresses">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 id="saved-addresses" className="text-lg font-semibold text-bone">Saved addresses</h2><p className="text-sm text-bone-muted">Manage where your orders are delivered.</p></div>
        <button type="button" onClick={() => { setEditing(null); setCreating((open) => !open); }} className={buttonClasses({ variant: "secondary", size: "sm" })}><Plus className="size-4" aria-hidden="true" />{creating ? "Close" : "Add address"}</button>
      </div>
      {error ? <p role="alert" className="text-sm text-error">{error}</p> : null}
      {creating ? <AddressForm {...formProps} onSave={(body) => save.mutate({ id: null, body })} /> : null}
      {editing ? <AddressForm key={editing.id} {...formProps} address={editing} onSave={(body) => save.mutate({ id: editing.id, body })} /> : null}
      {addresses.data.length ? (
        <ul className="flex flex-col">
          {addresses.data.map((address) => (
            <AddressRow key={address.id} address={address} busy={remove.isPending || makeDefault.isPending} onEdit={() => { setCreating(false); setEditing(address); }} onDelete={() => remove.mutate(address.id)} onDefault={() => makeDefault.mutate(address.id)} />
          ))}
        </ul>
      ) : creating ? null : (
        <EmptyState title="No saved addresses"><MapPin className="mr-1 inline size-4" aria-hidden="true" />Add an address to speed up your next checkout.</EmptyState>
      )}
    </section>
  );
}

function AddressRow({ address, busy, onEdit, onDelete, onDefault }: { address: SavedAddress; busy: boolean; onEdit: () => void; onDelete: () => void; onDefault: () => void }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <li className="flex min-w-0 flex-col gap-3 border-b border-rule py-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h3 className="font-medium text-bone">{address.label || address.full_name}{address.is_default ? <span className="ml-2 font-mono text-xs text-laurel">Default</span> : null}</h3>
        <p className="text-sm text-bone-muted">{address.full_name} · {address.phone}</p>
        <p className="break-words text-sm text-bone-muted">{address.address_line_1}{address.address_line_2 ? `, ${address.address_line_2}` : ""}, {address.city}, {address.lga}, {address.state}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {!address.is_default ? <button type="button" disabled={busy} onClick={onDefault} className={ACTION}><Check className="size-4" aria-hidden="true" /> Make default</button> : null}
        <button type="button" disabled={busy} onClick={onEdit} aria-label={`Edit ${address.label || address.full_name}`} className={ACTION}><Pencil className="size-4" aria-hidden="true" /> Edit</button>
        {confirming ? <><button type="button" disabled={busy} onClick={onDelete} className={buttonClasses({ variant: "danger", size: "sm" })}><Trash2 className="size-4" aria-hidden="true" /> Confirm delete</button><button type="button" onClick={() => setConfirming(false)} className={ACTION}>Cancel</button></> : <button type="button" disabled={busy} onClick={() => setConfirming(true)} aria-label={`Delete ${address.label || address.full_name}`} className={ACTION}><Trash2 className="size-4" aria-hidden="true" /></button>}
      </div>
    </li>
  );
}

export function AccountProfile() {
  const signedIn = useSignedIn();
  const router = useRouter();

  useEffect(() => {
    if (signedIn === false) router.replace("/login?next=/account/profile");
  }, [router, signedIn]);

  if (signedIn !== true) return null;
  return (
    <div className="flex flex-col gap-8">
      <PersonalDetails />
      <AddressManager />
    </div>
  );
}
