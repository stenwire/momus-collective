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
