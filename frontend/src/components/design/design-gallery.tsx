"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { convertDesignToProduct, fetchAdminCategories } from "@/lib/admin/api";
import { errorMessages } from "@/lib/auth/api";
import { useAuthStore } from "@/lib/auth/store";
import { useSignedIn } from "@/lib/auth/use-signed-in";
import { fetchDesignOptions } from "@/lib/api";
import {
  type SavedDesign,
  deleteDesign,
  duplicateDesign,
  exportDesign,
  listDesigns,
} from "@/lib/design/saved";
import { useDesignStore } from "@/lib/design/store";
import type { DesignOptions } from "@/lib/design/types";
import { formatNaira } from "@/lib/format";
import { inputClasses } from "@/components/ui/input";
import { FormErrors } from "../auth/form-field";
import { ShirtCanvas } from "./shirt-canvas";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadMore } from "@/components/ui/load-more";

const ACTION =
  "min-h-11  border border-rule px-3 text-sm text-bone hover:border-bone-muted disabled:opacity-60";

const created = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" });

function labelOf(list: { key: string; label: string }[], key: string) {
  return list.find((o) => o.key === key)?.label ?? key;
}

function DesignCard({
  design,
  options,
}: {
  design: SavedDesign;
  options: DesignOptions;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const load = useDesignStore((s) => s.load);
  const staff = useAuthStore((s) => s.user?.is_staff === true);
  const [converting, setConverting] = useState(false);
  const [category, setCategory] = useState("");
  const categories = useQuery({ queryKey: ["admin-categories"], queryFn: fetchAdminCategories, enabled: staff && converting });
  const [confirming, setConfirming] = useState(false);
  const [status, setStatus] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["saved-designs"] });
  const onError = (error: unknown) => setErrors(errorMessages(error));

  const convert = useMutation({
    mutationFn: () => convertDesignToProduct(design.id, category),
    meta: { success: "Draft product created. Review it, then publish.", label: "Created" },
    onSuccess: (product) => router.push(`/admin/products/${product.id}`),
    onError,
  });
  const duplicate = useMutation({
    mutationFn: () => duplicateDesign(design.id),
    meta: { success: `${design.name} duplicated.`, label: "Duplicated" },
    onSuccess: refresh,
    onError,
  });
  const remove = useMutation({
    mutationFn: () => deleteDesign(design.id),
    meta: { success: `${design.name} deleted.`, label: "Deleted" },
    onSuccess: refresh,
    onError,
  });
  const addToCart = useMutation({
    mutationFn: () => {
      setStatus("Preparing your print file…");
      return exportDesign(design.id);
    },
    meta: { success: "Print-ready file created at 300 DPI.", label: "Ready" },
    onSuccess: () => setStatus("Print-ready file created at 300 DPI."),
    onError: (error) => {
      setStatus("");
      onError(error);
    },
  });
  const busy = duplicate.isPending || remove.isPending || addToCart.isPending || convert.isPending;
  const { config } = design;
  const fonts = options.fonts.map((f) => ({ key: f.key, label: f.label }));

  return (
    <li className="flex flex-col gap-3 border border-rule p-3">
      <ShirtCanvas config={config} options={options} label={`Preview of ${design.name}`} />
      <div>
        <h2 className="font-semibold text-bone">{design.name}</h2>
        <p className="text-xs text-bone-muted">
          Created {created.format(new Date(design.created_at))}
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <dt className="text-bone-muted">Shirt</dt>
        <dd className="text-bone">{config.shirt_color}</dd>
        <dt className="text-bone-muted">Font</dt>
        <dd className="text-bone">{labelOf(fonts, config.font)}</dd>
        <dt className="text-bone-muted">Size</dt>
        <dd className="text-bone">{labelOf(options.font_sizes, config.font_size)}</dd>
        <dt className="text-bone-muted">Text colour</dt>
        <dd className="text-bone">{config.text_color}</dd>
        <dt className="text-bone-muted">Placement</dt>
        <dd className="text-bone">{labelOf(options.placements, config.placement)}</dd>
        <dt className="text-bone-muted">Price</dt>
        <dd className="text-laurel">
          {design.price === null ? "—" : formatNaira(design.price)}
        </dd>
      </dl>
      <FormErrors messages={errors} />
      <p aria-live="polite" className="text-xs text-ok">
        {status}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={busy}
          className={ACTION}
          aria-label={`Edit ${design.name}`}
          onClick={() => {
            load(design.id, design.name, config);
            router.push("/design");
          }}
        >
          Edit
        </button>
        <button
          type="button"
          disabled={busy}
          className={ACTION}
          aria-label={`Add ${design.name} to cart`}
          onClick={() => {
            setErrors([]);
            addToCart.mutate();
          }}
        >
          Add to cart
        </button>
        <button
          type="button"
          disabled={busy}
          className={ACTION}
          aria-label={`Duplicate ${design.name}`}
          onClick={() => duplicate.mutate()}
        >
          Duplicate
        </button>
        {staff ? (
          converting ? (
            <div className="col-span-2 grid grid-cols-2 gap-2">
              <select
                aria-label="Product category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className={`${inputClasses} col-span-2`}
              >
                <option value="">Choose a category</option>
                {categories.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <button type="button" disabled={busy || !category} className={ACTION} onClick={() => {
                setErrors([]);
                convert.mutate();
              }}>
                {convert.isPending ? "Creating draft…" : "Create draft product"}
              </button>
              <button type="button" className={ACTION} onClick={() => setConverting(false)}>
                Cancel
              </button>
            </div>
          ) : (
            <button type="button" disabled={busy} className={ACTION} onClick={() => setConverting(true)}>
              Make a product
            </button>
          )
        ) : null}
        {confirming ? (
          <div className="col-span-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy}
              className={`${ACTION} border-error text-error`}
              onClick={() => remove.mutate()}
            >
              Confirm delete
            </button>
            <button type="button" className={ACTION} onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={busy}
            className={ACTION}
            aria-label={`Delete ${design.name}`}
            onClick={() => setConfirming(true)}
          >
            Delete
          </button>
        )}
      </div>
    </li>
  );
}

export function DesignGallery() {
  const signedIn = useSignedIn();
  const router = useRouter();
  const options = useQuery({ queryKey: ["design-options"], queryFn: fetchDesignOptions });
  const startNew = useDesignStore((s) => s.startNew);
  const designs = useInfiniteQuery({
    queryKey: ["saved-designs"],
    queryFn: ({ pageParam }) => listDesigns(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last, pages) => (last.next ? pages.length + 1 : undefined),
    enabled: signedIn === true,
  });
  const rows = designs.data?.pages.flatMap((page) => page.results) ?? [];

  // Only a visitor who arrives signed out is sent to log in; someone who
  // just logged out here is already on their way elsewhere.
  const wasSignedIn = useRef(false);
  useEffect(() => {
    if (signedIn) wasSignedIn.current = true;
    if (signedIn === false && !wasSignedIn.current) {
      router.replace("/login?next=/account/designs");
    }
  }, [signedIn, router]);

  if (!signedIn) return null;
  if (designs.isError || options.isError) {
    return <p className="text-bone-muted">Your designs could not load. Refresh to try again.</p>;
  }
  if (!designs.data || !options.data) {
    return <p className="text-bone-muted">Loading your designs…</p>;
  }
  if (rows.length === 0) {
    return (
      <EmptyState title="A blank canvas">
        No saved designs yet.{" "}
        <Link
          href="/design"
          onClick={() => startNew(options.data.defaults)}
          className="inline-flex min-h-11 items-center text-laurel underline"
        >
          Design your first shirt
        </Link>
      </EmptyState>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button
          type="button"
          className={ACTION}
          onClick={() => {
            startNew(options.data.defaults);
            router.push("/design");
          }}
        >
          New design
        </button>
      </div>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((design) => (
          <DesignCard key={design.id} design={design} options={options.data} />
        ))}
      </ul>
      <LoadMore
        hasNext={Boolean(designs.hasNextPage)}
        loading={designs.isFetchingNextPage}
        onClick={() => designs.fetchNextPage()}
      />
    </div>
  );
}
