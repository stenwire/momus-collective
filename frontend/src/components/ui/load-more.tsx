export function LoadMore({
  hasNext,
  loading,
  onClick,
}: {
  hasNext: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  if (!hasNext) return null;
  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      className="min-h-11 self-center border border-rule px-6 text-sm text-bone hover:border-bone-muted disabled:opacity-60"
    >
      {loading ? "Loading…" : "Load more"}
    </button>
  );
}
