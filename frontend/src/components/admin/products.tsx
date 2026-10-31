"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, EyeOff, ExternalLink, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import {
  type AdminProduct,
  type AdminProductInput,
  deleteAdminProduct,
  fetchAdminProduct,
  fetchAdminProducts,
  nextPageParam,
  type ProductStatusFilter,
  saveAdminProduct,
} from "@/lib/admin/api";
import { errorMessages } from "@/lib/auth/api";
import { fetchCategories, fetchDesignOptions } from "@/lib/api";
import { formatNaira } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadMore } from "@/components/ui/load-more";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { buttonClasses } from "@/components/ui/button";
import { inputClasses } from "@/components/ui/input";

const KEY = ["admin-products"];
const ACTION = buttonClasses({ variant: "secondary", size: "sm" });
const STATUSES: { value: ProductStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Drafts" },
];

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function ProductForm({
  product,
  categories,
  colors,
  busy,
  onSave,
  onCancel,
}: {
  product?: AdminProduct;
  categories: { id: string; name: string }[];
  colors: { name: string; hex: string }[];
  busy: boolean;
  onSave: (body: AdminProductInput) => void;
  onCancel: () => void;
}) {
  const ids = {
    slogan: useId(), slug: useId(), category: useId(), price: useId(),
    description: useId(), images: useId(), tags: useId(), order: useId(),
  };
  const [slogan, setSlogan] = useState(product?.slogan ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(Boolean(product));
  const [category, setCategory] = useState(product?.category ?? "");
  const [price, setPrice] = useState(product ? String(product.price / 100) : "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [images, setImages] = useState(product?.mockup_images.join("\n") ?? "");
  const [tags, setTags] = useState(product?.tags.join(", ") ?? "");
  const [shirtColors, setShirtColors] = useState(product?.shirt_colors ?? []);
  const [displayOrder, setDisplayOrder] = useState(String(product?.display_order ?? 0));
  const [isActive, setIsActive] = useState(product?.is_active ?? true);

  return (
    <form
      aria-label={product ? `Edit ${product.slogan}` : "New product"}
      className="grid gap-3 border-y border-rule py-4 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSave({
          slogan,
          slug,
          category,
          price: Math.round(Number(price) * 100),
          description,
          shirt_colors: shirtColors,
          mockup_images: images.split(/\r?\n/).map((url) => url.trim()).filter(Boolean),
          tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
          is_active: isActive,
          is_custom: product?.is_custom ?? false,
          display_order: Number(displayOrder),
        });
      }}
    >
      <Field label="Slogan" id={ids.slogan}>
        <input id={ids.slogan} required maxLength={255} value={slogan} onChange={(event) => {
          const value = event.target.value;
          setSlogan(value);
          if (!slugEdited) setSlug(slugify(value));
        }} className={inputClasses} />
      </Field>
      <Field label="Product URL slug" id={ids.slug}>
        <input id={ids.slug} required value={slug} onChange={(event) => {
          setSlug(event.target.value);
          setSlugEdited(true);
        }} className={inputClasses} />
      </Field>
      <Field label="Category" id={ids.category}>
        <select id={ids.category} required value={category} onChange={(event) => setCategory(event.target.value)} className={inputClasses}>
          <option value="">Choose a category</option>
          {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </Field>
      <Field label="Price (₦)" id={ids.price}>
        <input id={ids.price} required type="number" min="0.01" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} className={inputClasses} />
      </Field>
      <Field label="Description" id={ids.description}>
        <textarea id={ids.description} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} className={inputClasses} />
      </Field>
      <Field label="Mockup image URLs, one per line" id={ids.images}>
        <textarea id={ids.images} required rows={3} placeholder="https://example.com/front-view.png" value={images} onChange={(event) => setImages(event.target.value)} className={inputClasses} />
      </Field>
      <Field label="Tags, separated by commas" id={ids.tags}>
        <input id={ids.tags} value={tags} onChange={(event) => setTags(event.target.value)} className={inputClasses} />
      </Field>
      <Field label="Display order" id={ids.order}>
        <input id={ids.order} type="number" min="0" value={displayOrder} onChange={(event) => setDisplayOrder(event.target.value)} className={inputClasses} />
      </Field>
      <fieldset className="flex flex-col gap-2 sm:col-span-2">
        <legend className="mb-1 text-sm text-bone-muted">Available shirt colours</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {colors.map((color) => (
            <label key={color.name} className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm text-bone">
              <input type="checkbox" checked={shirtColors.includes(color.name)} onChange={() => setShirtColors((current) => current.includes(color.name) ? current.filter((name) => name !== color.name) : [...current, color.name])} />
              <span className="size-4 border border-rule" style={{ backgroundColor: color.hex }} aria-hidden="true" />
              {color.name}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm text-bone sm:col-span-2">
        <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
        Publish product
      </label>
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <button type="submit" disabled={busy} className={buttonClasses({ size: "sm" })}>
          <Save className="size-4" aria-hidden="true" /> {busy ? "Saving…" : product ? "Save changes" : "Create product"}
        </button>
        <button type="button" disabled={busy} onClick={onCancel} className={ACTION}>
          <X className="size-4" aria-hidden="true" /> Cancel
        </button>
      </div>
    </form>
  );
}

function Field({ label, children, id }: { label: string; children: React.ReactNode; id: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-sm text-bone-muted">{label}</label>
      {children}
    </div>
  );
}

function ProductRow({
  product,
  categoryName,
  onToggle,
  onDelete,
  busy,
}: {
  product: AdminProduct;
  categoryName: string;
  onToggle: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const image = product.mockup_images[0];
  return (
    <li className="grid min-w-0 gap-3 border-b border-rule py-4 sm:grid-cols-[5rem_minmax(0,1fr)_auto] sm:items-center">
      <div className="relative aspect-square w-20 overflow-hidden border border-rule bg-ink-raised">
        {image ? <Image src={image} alt="" fill sizes="80px" className="object-cover" /> : null}
      </div>
      <div className="min-w-0">
        <h2 className="truncate font-medium text-bone">{product.slogan}</h2>
        <p className="truncate text-sm text-bone-muted">{categoryName} · {product.slug}</p>
        <p className="mt-1 font-mono text-xs text-laurel">{formatNaira(product.price)} · {product.total_orders} sold · {product.is_active ? "Published" : "Draft"}</p>
      </div>
      <div className="flex flex-wrap gap-2 sm:justify-end">
        {confirmDelete ? (
          <>
            <button type="button" disabled={busy} onClick={onDelete} className={buttonClasses({ variant: "danger", size: "sm" })}>
              <Trash2 className="size-4" aria-hidden="true" /> Confirm
            </button>
            <button type="button" onClick={() => setConfirmDelete(false)} className={ACTION}>Cancel</button>
          </>
        ) : (
          <>
            <Link href={`/product/${product.slug}`} aria-label={`View ${product.slogan}`} className={ACTION}>
              <ExternalLink className="size-4" aria-hidden="true" />
            </Link>
            <Link href={`/admin/products/${product.id}`} aria-label={`Edit ${product.slogan}`} className={ACTION}>
              <Pencil className="size-4" aria-hidden="true" /> Edit
            </Link>
            <button type="button" disabled={busy} onClick={onToggle} aria-label={`${product.is_active ? "Unpublish" : "Publish"} ${product.slogan}`} className={ACTION}>
              {product.is_active ? <EyeOff className="size-4" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />}
              {product.is_active ? "Unpublish" : "Publish"}
            </button>
            <button type="button" disabled={busy} onClick={() => setConfirmDelete(true)} aria-label={`Delete ${product.slogan}`} className={ACTION}>
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </li>
  );
}

const toInput = (product: AdminProduct, is_active: boolean): AdminProductInput => ({
  slogan: product.slogan,
  slug: product.slug,
  category: product.category,
  price: product.price,
  description: product.description,
  shirt_colors: product.shirt_colors,
  mockup_images: product.mockup_images,
  tags: product.tags,
  is_active,
  is_custom: product.is_custom,
  display_order: product.display_order,
});

export function AdminProducts() {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim(), 300);
  const [status, setStatus] = useState<ProductStatusFilter>("all");
  const [category, setCategory] = useState("");
  const filtered = Boolean(search || category || status !== "all");
  const products = useInfiniteQuery({
    queryKey: [...KEY, search, status, category],
    queryFn: ({ pageParam }) => fetchAdminProducts({ search, status, category, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: nextPageParam,
  });
  const categories = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const remove = useMutation({
    mutationFn: deleteAdminProduct,
    meta: { success: "Product deleted.", label: "Deleted" },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: KEY });
      setMessage("Product deleted.");
      setErrors([]);
    },
    onError: (error) => setErrors(errorMessages(error)),
  });
  const toggle = useMutation({
    mutationFn: (product: AdminProduct) => saveAdminProduct(product.id, toInput(product, !product.is_active)),
    meta: {
      success: (product: AdminProduct) => (product.is_active ? `${product.slogan} is live in the shop.` : `${product.slogan} moved to drafts.`),
      label: "Updated",
    },
    onSuccess: async (product) => {
      await queryClient.invalidateQueries({ queryKey: KEY });
      setMessage(`${product.slogan} ${product.is_active ? "published" : "moved to drafts"}.`);
    },
    onError: (error) => setErrors(errorMessages(error)),
  });

  if (products.isError || categories.isError) {
    return <p role="alert" className="text-error">Product management could not load. Refresh to try again.</p>;
  }
  if (!products.data || !categories.data) {
    return <p role="status" className="text-sm text-bone-muted">Loading products…</p>;
  }

  const rows = products.data.pages.flatMap((page) => page.results);
  const categoryName = (id: string) => categories.data.categories.find((item) => item.id === id)?.name ?? "Uncategorised";

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="sr-only" htmlFor="admin-product-search">Search products</label>
        <input id="admin-product-search" type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Find a product…" className={`${inputClasses} min-w-0 flex-1 sm:max-w-sm`} />
        <Link href="/admin/products/new" className={buttonClasses({ size: "sm" })}>
          <Plus className="size-4" aria-hidden="true" /> New product
        </Link>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Filter by status" className="flex border border-rule">
          {STATUSES.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={status === option.value}
              onClick={() => setStatus(option.value)}
              className={`min-h-11 px-4 text-xs font-semibold uppercase tracking-wider transition-colors ${status === option.value ? "bg-laurel text-ink" : "text-bone-muted hover:text-bone"}`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <label className="sr-only" htmlFor="admin-product-category">Filter by category</label>
        <select id="admin-product-category" value={category} onChange={(event) => setCategory(event.target.value)} className={`${inputClasses} w-auto min-w-44`}>
          <option value="">All categories</option>
          {categories.data.categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        {filtered ? (
          <button type="button" onClick={() => { setSearchInput(""); setStatus("all"); setCategory(""); }} className="min-h-11 text-sm text-laurel underline underline-offset-4">
            Clear filters
          </button>
        ) : null}
      </div>
      {message ? <p role="status" className="text-sm text-ok">{message}</p> : null}
      {errors.length ? <p role="alert" className="text-sm text-error">{errors.join(" ")}</p> : null}
      {rows.length ? (
        <ul className="min-w-0">
          {rows.map((product) => (
            <ProductRow
              key={product.id}
              product={product}
              categoryName={categoryName(product.category)}
              busy={remove.isPending || toggle.isPending}
              onToggle={() => { setErrors([]); toggle.mutate(product); }}
              onDelete={() => remove.mutate(product.id)}
            />
          ))}
        </ul>
      ) : filtered ? (
        <p className="py-8 text-center text-sm text-bone-muted">No products match those filters.</p>
      ) : (
        <EmptyState title="No products yet">
          Add the first product to the catalog. <Link href="/admin/products/new" className="text-laurel underline">Create product</Link>
        </EmptyState>
      )}
      <LoadMore hasNext={Boolean(products.hasNextPage)} loading={products.isFetchingNextPage} onClick={() => products.fetchNextPage()} />
    </div>
  );
}

export function AdminProductEditor({ id }: { id?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const product = useQuery({ queryKey: ["admin-product", id], queryFn: () => fetchAdminProduct(id!), enabled: Boolean(id) });
  const categories = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const options = useQuery({ queryKey: ["design-options"], queryFn: fetchDesignOptions });
  const [errors, setErrors] = useState<string[]>([]);
  const save = useMutation({
    mutationFn: (body: AdminProductInput) => saveAdminProduct(id ?? null, body),
    meta: {
      success: (product: AdminProduct) => (id ? `${product.slogan} saved.` : `${product.slogan} created.`),
      label: id ? "Saved" : "Created",
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: KEY });
      await queryClient.invalidateQueries({ queryKey: ["admin-product", id] });
      router.push("/admin/products");
    },
    onError: (error) => setErrors(errorMessages(error)),
  });

  if (product.isError || categories.isError || options.isError) {
    return <p role="alert" className="text-error">This product could not load. Go back and try again.</p>;
  }
  if ((id && !product.data) || !categories.data || !options.data) {
    return <p role="status" className="text-sm text-bone-muted">Loading product…</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {errors.length ? <p role="alert" className="text-sm text-error">{errors.join(" ")}</p> : null}
      <ProductForm
        key={product.data?.id ?? "new"}
        product={product.data}
        categories={categories.data.categories}
        colors={options.data.shirt_colors}
        busy={save.isPending}
        onSave={(body) => { setErrors([]); save.mutate(body); }}
        onCancel={() => router.push("/admin/products")}
      />
    </div>
  );
}
