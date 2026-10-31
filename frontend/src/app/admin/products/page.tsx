import { AdminProducts } from "@/components/admin/products";
import { NewDesignLink } from "@/components/design/new-design-link";

export default function AdminProductsPage() {
  return (
    <main className="mx-auto flex w-full min-w-0 max-w-3xl flex-1 flex-col gap-4 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-zinc-50">Products</h1>
        <NewDesignLink href="/admin/design-studio" className="inline-flex min-h-11 items-center border border-rule px-4 text-sm text-bone hover:border-bone-muted">
          Create a shirt design
        </NewDesignLink>
      </div>
      <AdminProducts />
    </main>
  );
}
