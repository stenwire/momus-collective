import { ReviewModeration } from "@/components/admin/review-moderation";

export default function AdminReviewsPage() {
  return (
    <main className="mx-auto flex w-full min-w-0 max-w-3xl flex-1 flex-col gap-4 px-4 py-6">
      <h1 className="text-2xl font-semibold text-zinc-50">Reviews</h1>
      <ReviewModeration />
    </main>
  );
}
