"use client";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export function SearchInput({ value, onChange }: Props) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Search by slogan or category…"
      aria-label="Search products"
      className="mb-4 mr-2 min-h-11 flex-1 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-50 placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
    />
  );
}
