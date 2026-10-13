import type { Metadata } from "next";
import { UnsubscribeButton } from "@/components/unsubscribe-button";

export const metadata: Metadata = {
  title: "Unsubscribe | momus collective",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ token?: string }> };

// A button, not an automatic unsubscribe: mail scanners open links.
export default async function UnsubscribePage({ searchParams }: Props) {
  const { token } = await searchParams;
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-12">
      <h1 className="text-2xl font-semibold text-zinc-50">Unsubscribe from new drops</h1>
      {token ? (
        <UnsubscribeButton token={token} />
      ) : (
        <p className="text-zinc-400">This link is missing its token. Use the link from your email.</p>
      )}
    </main>
  );
}
