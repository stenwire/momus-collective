"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Save } from "lucide-react";
import { useId, useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import { inputClasses } from "@/components/ui/input";
import { type AdminCategory, type AdminCategoryInput, fetchAdminCategories, saveAdminCategory } from "@/lib/admin/api";
import { errorMessages } from "@/lib/auth/api";

const KEY = ["admin-categories"];

function CategoryForm({ category, onDone }: { category?: AdminCategory; onDone: (message: string) => void }) {
  const queryClient = useQueryClient();
  const id = useId();
  const [name, setName] = useState(category?.name ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [order, setOrder] = useState(String(category?.display_order ?? 0));
  const [active, setActive] = useState(category?.is_active ?? true);
  const [errors, setErrors] = useState<string[]>([]);
  const save = useMutation({
    mutationFn: (body: AdminCategoryInput) => saveAdminCategory(category?.id ?? null, body),
    meta: { success: (saved: { name: string }) => `${saved.name} saved.`, label: category ? "Saved" : "Created" },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: KEY });
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
      onDone(`Saved ${saved.name}.`);
    },
    onError: (error) => setErrors(errorMessages(error)),
  });
  return (
    <form
      aria-label={category ? `Edit ${category.name}` : "New category"}
      className="grid gap-3 border-y border-rule py-4 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        setErrors([]);
        save.mutate({ name, slug, description, display_order: Number(order), is_active: active });
      }}
    >
      <label className="flex flex-col gap-1 text-sm text-bone-muted" htmlFor={`${id}-name`}>
        Name
        <input id={`${id}-name`} required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} className={inputClasses} />
      </label>
      <label className="flex flex-col gap-1 text-sm text-bone-muted" htmlFor={`${id}-slug`}>
        URL slug
        <input id={`${id}-slug`} required value={slug} onChange={(e) => setSlug(e.target.value)} className={inputClasses} />
      </label>
      <label className="flex flex-col gap-1 text-sm text-bone-muted sm:col-span-2" htmlFor={`${id}-description`}>
        Description
        <textarea id={`${id}-description`} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className={inputClasses} />
      </label>
      <label className="flex flex-col gap-1 text-sm text-bone-muted" htmlFor={`${id}-order`}>
        Display order
        <input id={`${id}-order`} type="number" min="0" value={order} onChange={(e) => setOrder(e.target.value)} className={inputClasses} />
      </label>
      <label className="inline-flex min-h-11 items-center gap-2 text-sm text-bone">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        Visible in the shop
      </label>
      {errors.length ? <p role="alert" className="text-sm text-error sm:col-span-2">{errors.join(" ")}</p> : null}
      <div className="sm:col-span-2">
        <button type="submit" disabled={save.isPending} className={buttonClasses({ size: "sm" })}>
          <Save className="size-4" aria-hidden="true" /> {save.isPending ? "Saving…" : "Save category"}
        </button>
      </div>
    </form>
  );
}

export function AdminCategories() {
  const categories = useQuery({ queryKey: KEY, queryFn: fetchAdminCategories });
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [message, setMessage] = useState("");
  if (categories.isError) return <p role="alert" className="text-error">Categories could not load. Refresh to try again.</p>;
  if (!categories.data) return <p role="status" className="text-sm text-bone-muted">Loading categories…</p>;
  const done = (text: string) => {
    setEditing(null);
    setMessage(text);
  };
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex justify-end">
        <button type="button" onClick={() => setEditing(editing === "new" ? null : "new")} className={buttonClasses({ size: "sm" })}>
          <Plus className="size-4" aria-hidden="true" /> {editing === "new" ? "Close" : "New category"}
        </button>
      </div>
      {message ? <p role="status" className="text-sm text-ok">{message}</p> : null}
      {editing === "new" ? <CategoryForm onDone={done} /> : null}
      <ul>
        {categories.data.map((category) => (
          <li key={category.id} className="border-b border-rule py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium text-bone">{category.name}</p>
                <p className="font-mono text-xs text-bone-muted">{category.slug} · {category.is_active ? "Visible" : "Hidden"}</p>
              </div>
              <button
                type="button"
                aria-label={`Edit ${category.name}`}
                onClick={() => setEditing(editing === category.id ? null : category.id)}
                className={buttonClasses({ variant: "secondary", size: "sm" })}
              >
                Edit
              </button>
            </div>
            {editing === category.id ? <CategoryForm key={category.id} category={category} onDone={done} /> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
