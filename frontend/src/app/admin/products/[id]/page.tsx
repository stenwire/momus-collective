import Link from "next/link";
import { AdminProductEditor } from "@/components/admin/products";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="mx-auto flex w-full min-w-0 max-w-3xl flex-1 flex-col gap-4 px-4 py-6">
      <Link href="/admin/products" className="text-sm text-laurel underline">Back to products</Link>
      <h1 className="text-2xl font-semibold text-zinc-50">Edit product</h1>
      <AdminProductEditor id={id} />
    </main>
  );
}
