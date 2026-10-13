import { ApiError, authFetch } from "@/lib/auth/api";

export type Review = {
  id: string;
  rating: number;
  text: string;
  reviewer: string;
  verified: boolean;
  created_at: string;
};

export type ReviewPage = { count: number; next: string | null; average: string; results: Review[] };

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await authFetch(path, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body);
  return body as T;
}

export const fetchReviews = (slug: string, page: number) =>
  call<ReviewPage>(`/api/v1/products/${slug}/reviews/?page=${page}`);

export const fetchReviewEligibility = (slug: string, token: string) =>
  call<{ can_review: boolean; reason: string }>(
    `/api/v1/products/${slug}/reviews/eligibility/${token ? `?token=${encodeURIComponent(token)}` : ""}`,
  );

export const postReview = (slug: string, body: { rating: number; text: string; token: string }) =>
  call<Review>(`/api/v1/products/${slug}/reviews/`, { method: "POST", body: JSON.stringify(body) });
