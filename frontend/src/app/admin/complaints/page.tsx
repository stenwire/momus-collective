import { AdminComplaints } from "@/components/admin/complaints";

export default function AdminComplaintsPage() {
  return (
    <main className="mx-auto flex w-full min-w-0 max-w-5xl flex-1 flex-col gap-4 px-4 py-6 lg:px-8">
      <h1 className="font-display text-3xl uppercase leading-none text-bone">Customer complaints</h1>
      <AdminComplaints />
    </main>
  );
}