"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { errorMessages } from "@/lib/auth/api";
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
import { FormErrors } from "../auth/form-field";
import { ShirtCanvas } from "./shirt-canvas";

const ACTION =
  "min-h-11 rounded-md border border-zinc-700 px-3 text-sm text-zinc-100 hover:border-zinc-500 disabled:opacity-60";

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
  const [confirming, setConfirming] = useState(false);
  const [status, setStatus] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["saved-designs"] });
  const onError = (error: unknown) => setErrors(errorMessages(error));

  const duplicate = useMutation({
    mutationFn: () => duplicateDesign(design.id),
    onSuccess: refresh,
    onError,
  });
  const remove = useMutation({
    mutationFn: () => deleteDesign(design.id),
    onSuccess: refresh,
    onError,
  });
  const addToCart = useMutation({
    mutationFn: () => {
      setStatus("Preparing your print file…");
      return exportDesign(design.id);
    },
    onSuccess: () => setStatus("Print-ready file created at 300 DPI."),
    onError: (error) => {
      setStatus("");
      onError(error);
    },
  });
  const busy = duplicate.isPending || remove.isPending || addToCart.isPending;
  const { config } = design;
  const fonts = options.fonts.map((f) => ({ key: f.key, label: f.label }));

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-zinc-800 p-3">
      <ShirtCanvas config={config} options={options} label={`Preview of ${design.name}`} />
      <div>
        <h2 className="font-semibold text-zinc-50">{design.name}</h2>
        <p className="text-xs text-zinc-400">
          Created {created.format(new Date(design.created_at))}
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <dt className="text-zinc-400">Shirt</dt>
        <dd className="text-zinc-200">{config.shirt_color}</dd>
        <dt className="text-zinc-400">Font</dt>
        <dd className="text-zinc-200">{labelOf(fonts, config.font)}</dd>
        <dt className="text-zinc-400">Size</dt>
        <dd className="text-zinc-200">{labelOf(options.font_sizes, config.font_size)}</dd>
        <dt className="text-zinc-400">Text colour</dt>
        <dd className="text-zinc-200">{config.text_color}</dd>
        <dt className="text-zinc-400">Placement</dt>
        <dd className="text-zinc-200">{labelOf(options.placements, config.placement)}</dd>
        <dt className="text-zinc-400">Price</dt>
        <dd className="text-amber-400">
          {design.price === null ? "—" : formatNaira(design.price)}
        </dd>
      </dl>
      <FormErrors messages={errors} />
      <p aria-live="polite" className="text-xs text-emerald-400">
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
        {confirming ? (
          <div className="col-span-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy}
              className={`${ACTION} border-red-500 text-red-400`}
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
  const designs = useQuery({
    queryKey: ["saved-designs"],
    queryFn: listDesigns,
    enabled: signedIn === true,
  });

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
    return <p className="text-zinc-400">Your designs could not load. Refresh to try again.</p>;
  }
  if (!designs.data || !options.data) {
    return <p className="text-zinc-400">Loading your designs…</p>;
  }
  if (designs.data.length === 0) {
    return (
      <p className="text-zinc-400">
        No saved designs yet.{" "}
        <Link href="/design" className="inline-flex min-h-11 items-center text-amber-400 underline">
          Design your first shirt
        </Link>
      </p>
    );
  }
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {designs.data.map((design) => (
        <DesignCard key={design.id} design={design} options={options.data} />
      ))}
    </ul>
  );
}
