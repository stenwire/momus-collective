import type { Collection } from "@/lib/api";
import { ProductCard } from "./product-card";

export function CollectionCarousel({ collection }: { collection: Collection }) {
  if (collection.products.length === 0) return null;

  return (
    <section className="px-4 py-6">
      <h2 className="mb-3 text-lg font-semibold text-zinc-50">
        {collection.name}
      </h2>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {collection.products.map((product) => (
          <div key={product.id} className="w-40 flex-shrink-0 sm:w-48">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}
