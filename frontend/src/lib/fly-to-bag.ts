// The bag button in the header carries this id.
export const BAG_TARGET_ID = "bag-target";
const FLIGHT_MS = 650;

// Sends a small copy of `source` to the bag icon with the Web Animations
// API (no motion features needed). Resolves at once under reduced motion,
// without the bag, or where the API is missing.
export function flyToBag(source: HTMLElement | null): Promise<void> {
  const target = document.getElementById(BAG_TARGET_ID);
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (!source || !target || reduce || typeof source.animate !== "function") {
    return Promise.resolve();
  }
  const from = source.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  const size = Math.min(from.width, 160);
  const ghost = source.cloneNode(true) as HTMLElement;
  ghost.setAttribute("aria-hidden", "true");
  ghost.removeAttribute("id");
  Object.assign(ghost.style, {
    position: "fixed",
    left: `${from.left + (from.width - size) / 2}px`,
    top: `${from.top + (from.height - size) / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
    margin: "0",
    zIndex: "70",
    pointerEvents: "none",
  });
  document.body.append(ghost);
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const flight = ghost.animate(
    [
      { transform: "translate(0, 0) scale(1) rotate(0deg)", opacity: 1 },
      { transform: `translate(${dx * 0.6}px, ${dy * 0.3 - 60}px) scale(0.5) rotate(-8deg)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.1) rotate(-14deg)`, opacity: 0.2 },
    ],
    { duration: FLIGHT_MS, easing: "cubic-bezier(0.7, 0, 0.84, 0)" },
  );
  return flight.finished.then(
    () => ghost.remove(),
    () => ghost.remove(),
  );
}
