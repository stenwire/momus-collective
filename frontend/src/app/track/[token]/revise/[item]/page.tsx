import type { Metadata } from "next";
import { RevisionTool } from "@/components/orders/revision-tool";

export const metadata: Metadata = {
  title: "Revise your design | momus collective",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type Props = { params: Promise<{ token: string; item: string }> };

export default async function RevisePage({ params }: Props) {
  const { token, item } = await params;
  return (
    <main className="flex flex-1 flex-col">
      <h1 className="px-4 pt-8 pb-4 text-2xl font-semibold text-zinc-50">Revise your design</h1>
      <RevisionTool token={token} itemId={item} />
    </main>
  );
}
