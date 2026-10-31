import Image from "next/image";
import { cn } from "@/lib/cn";

// The raven's PNG has a near-black matte; lighten drops it into the ink
// behind it, until the transparent cutout lands (D-110, T-614).
export function Raven({
  className,
  priority = false,
  sizes = "(min-width: 768px) 256px, 176px",
}: {
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  return (
    <div className={cn("relative aspect-[950/1476]", className)}>
      <Image
        src="/mascot-raven.png"
        alt="Momus's raven, laurel-crowned, perched on a broken marble column"
        fill
        priority={priority}
        sizes={sizes}
        className="object-contain mix-blend-lighten"
      />
    </div>
  );
}
