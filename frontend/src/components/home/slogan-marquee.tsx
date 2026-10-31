"use client";

import { useQuery } from "@tanstack/react-query";
import { Marquee } from "@/components/ui/marquee";
import { fetchCollections } from "@/lib/api";

const MAX_SLOGANS = 12;

// Live slogans from the collections the page already prefetched.
export function SloganMarquee() {
  const { data } = useQuery({ queryKey: ["collections"], queryFn: fetchCollections });
  const slogans = [
    ...new Set((data ?? []).flatMap((c) => c.products.map((p) => p.slogan))),
  ].slice(0, MAX_SLOGANS);
  if (slogans.length < 2) return null;

  return (
    <Marquee
      label="Slogans in the shop"
      items={slogans}
      className="bg-ink font-display text-2xl uppercase tracking-tight text-bone md:text-3xl"
    />
  );
}
