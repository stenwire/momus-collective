import { ApiError, authFetch } from "@/lib/auth/api";
import type { DesignConfig } from "./types";

export type SavedDesign = {
  id: string;
  name: string;
  config: DesignConfig;
  preview_image_url: string;
  design_file_url: string;
  created_at: string;
  updated_at: string;
};

async function parse<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body);
  return body as T;
}

export async function saveDesign(
  id: string | null,
  name: string,
  config: DesignConfig,
): Promise<SavedDesign> {
  const res = await authFetch(id ? `/api/v1/designs/${id}/` : "/api/v1/designs/", {
    method: id ? "PATCH" : "POST",
    body: JSON.stringify({ name, config }),
  });
  return parse<SavedDesign>(res);
}

export function defaultDesignName(text: string): string {
  const firstLine = text.split("\n")[0].trim();
  return firstLine.length > 40 ? `${firstLine.slice(0, 39)}…` : firstLine;
}

export async function fetchDesign(id: string): Promise<SavedDesign> {
  return parse<SavedDesign>(await authFetch(`/api/v1/designs/${id}/`));
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// The print file renders in a Celery task (EFF-07), so wait for its URL.
export async function exportDesign(
  id: string,
  { attempts = 30, intervalMs = 1000 } = {},
): Promise<SavedDesign> {
  await parse(await authFetch(`/api/v1/designs/${id}/export/`, { method: "POST" }));
  for (let i = 0; i < attempts; i++) {
    const design = await fetchDesign(id);
    if (design.design_file_url) return design;
    await sleep(intervalMs);
  }
  throw new ApiError(504, { detail: "The print file is taking too long. Try again." });
}
