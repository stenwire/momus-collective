import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ComingSoon } from "@/components/site/coming-soon";

const ITEMS: Record<string, { title: string; description: string }> = {
  "art-prints": { title: "Art prints", description: "Wall pieces with the same sharp point of view as the shirts." },
  "tote-bags": { title: "Tote bags", description: "Room for the everyday things, with something worth saying on the outside." },
  hoodies: { title: "Hoodies", description: "A heavier layer for cooler days and louder ideas." },
  stickers: { title: "Stickers", description: "Small-format statements for laptops, notebooks, and wherever they land." },
};

type Props = { params: Promise<{ item: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { item } = await params;
  const product = ITEMS[item];
  return { title: product ? `${product.title} | momus collective` : "Coming soon | momus collective" };
}

export default async function ComingSoonPage({ params }: Props) {
  const { item } = await params;
  const product = ITEMS[item];
  if (!product) notFound();
  return <ComingSoon {...product} />;
}