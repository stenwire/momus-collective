import { Shop } from "@/components/catalog/shop";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <h1 className="px-4 pt-8 text-2xl font-semibold text-zinc-50">Shop</h1>
      <Shop />
    </main>
  );
}
