"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchCollections } from "@/lib/api";
import { CollectionCarousel } from "./collection-carousel";

export function Collections() {
  const { data } = useQuery({
    queryKey: ["collections"],
    queryFn: fetchCollections,
  });

  if (!data || data.length === 0) return null;

  return (
    <div>
      {data.map((collection) => (
        <CollectionCarousel key={collection.id} collection={collection} />
      ))}
    </div>
  );
}
