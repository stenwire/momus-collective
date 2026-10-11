import { CustomerDetailView } from "@/components/admin/customer-detail";

type Props = { params: Promise<{ id: string }> };

export default async function AdminCustomerPage({ params }: Props) {
  const { id } = await params;
  return <CustomerDetailView id={id} />;
}
