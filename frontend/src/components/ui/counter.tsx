import { cn } from "@/lib/cn";

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

// An odometer: each digit is a 0-9 column slid into place. The number is
// read once from the sr-only copy, never as ten stacked digits.
export function Counter({ value, className }: { value: number; className?: string }) {
  const text = String(Math.max(0, Math.trunc(value)));
  return (
    <span className={cn("inline-flex font-mono tabular-nums", className)}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className="inline-flex h-[1lh] overflow-hidden">
        {text.split("").map((digit, i) => (
          <span
            key={text.length - i}
            data-digit={digit}
            // self-start: a stretched column would be one line tall, so
            // -10% would move it a fraction of a digit.
            className="flex flex-col self-start transition-transform duration-300 ease-[var(--ease-out-expo)] motion-reduce:transition-none"
            style={{ transform: `translateY(-${Number(digit) * 10}%)` }}
          >
            {DIGITS.map((d) => (
              <span key={d} className="h-[1lh] leading-[inherit]">
                {d}
              </span>
            ))}
          </span>
        ))}
      </span>
    </span>
  );
}
