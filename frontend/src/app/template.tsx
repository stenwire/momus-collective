// A CSS entrance, so the page is visible before hydration (D-112). The
// animation makes a stacking context, so it paints ink itself: blended
// images (mix-blend-lighten) need an opaque backdrop inside it.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 animate-route flex-col bg-ink">{children}</div>;
}
