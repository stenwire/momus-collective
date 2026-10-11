import { AdminOrderDetailView } from "@/components/admin/order-detail";

type Props = { params: Promise<{ id: string }> };

export default async function AdminOrderPage({ params }: Props) {
  const { id } = await params;
  return <AdminOrderDetailView id={id} />;
}
