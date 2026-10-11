import { CustomerList } from "@/components/admin/customer-list";

export default function AdminCustomersPage() {
  return (
    <main className="mx-auto flex w-full min-w-0 max-w-5xl flex-1 flex-col gap-4 px-4 py-6">
      <h1 className="text-2xl font-semibold text-zinc-50">Customers</h1>
      <CustomerList />
    </main>
  );
}
