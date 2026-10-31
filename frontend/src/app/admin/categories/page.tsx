import { AdminCategories } from "@/components/admin/categories";

export default function AdminCategoriesPage() {
  return (
    <main className="mx-auto flex w-full min-w-0 max-w-3xl flex-1 flex-col gap-4 px-4 py-6">
      <h1 className="font-display text-3xl uppercase leading-none text-bone">Categories</h1>
      <AdminCategories />
    </main>
  );
}
