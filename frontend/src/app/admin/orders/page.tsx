import { OrdersView } from "@/components/admin/orders-view";

export default function AdminOrdersPage() {
  return (
    <main className="flex min-w-0 flex-1 flex-col gap-4 py-6">
      <h1 className="px-4 text-2xl font-semibold text-zinc-50">Orders</h1>
      <OrdersView />
    </main>
  );
}
