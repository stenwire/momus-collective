import { PageSkeleton } from "@/components/ui/page-skeleton";

// Only routes that never call notFound() get a loading boundary: one
// streams the response, and a 404 inside it would go out as a 200.
export default function Loading() {
  return <PageSkeleton />;
}
