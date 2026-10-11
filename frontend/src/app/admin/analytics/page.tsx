import { AnalyticsDashboard } from "@/components/admin/analytics-dashboard";

export default function AdminAnalyticsPage() {
  return (
    <main className="mx-auto flex w-full min-w-0 max-w-5xl flex-1 flex-col gap-4 px-4 py-6">
      <h1 className="text-2xl font-semibold text-zinc-50">Analytics</h1>
      <AnalyticsDashboard />
    </main>
  );
}
