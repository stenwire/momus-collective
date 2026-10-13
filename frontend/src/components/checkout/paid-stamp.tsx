function Mask({ mood }: { mood: "tragedy" | "comedy" }) {
  const mouth = mood === "comedy" ? "M18 38 Q32 52 46 38" : "M18 46 Q32 34 46 46";
  const brows = mood === "comedy" ? "M16 22 L26 19 M38 19 L48 22" : "M16 18 L26 22 M38 22 L48 18";
  return (
    <svg viewBox="0 0 64 72" className="size-full" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path d="M8 10 Q32 0 56 10 Q60 44 32 70 Q4 44 8 10 Z" />
      <path d={brows} strokeLinecap="round" />
      <ellipse cx="22" cy="28" rx="5" ry="3.5" />
      <ellipse cx="42" cy="28" rx="5" ry="3.5" />
      <path d={mouth} strokeLinecap="round" />
    </svg>
  );
}

// The seal drops onto the receipt; then the mask turns from tragedy to
// comedy. Both settle at once under reduced motion.
export function PaidStamp() {
  return (
    <div aria-hidden="true" className="flex items-center gap-6">
      <div className="grid size-32 shrink-0 animate-stamp place-items-center rounded-full border-4 border-double border-laurel text-laurel [transform:rotate(-8deg)]">
        <span className="font-display text-4xl uppercase leading-none tracking-tight">Paid</span>
      </div>
      <div className="size-20 [perspective:600px]">
        <div
          data-testid="mask"
          className="relative size-full animate-flip text-bone [transform-style:preserve-3d]"
        >
          <div className="absolute inset-0 [backface-visibility:hidden]">
            <Mask mood="tragedy" />
          </div>
          <div className="absolute inset-0 text-laurel [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <Mask mood="comedy" />
          </div>
        </div>
      </div>
    </div>
  );
}
