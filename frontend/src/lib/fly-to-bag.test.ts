import { afterEach, describe, expect, it, vi } from "vitest";
import { BAG_TARGET_ID, flyToBag } from "./fly-to-bag";

function setup({ reduce = false } = {}) {
  const source = document.createElement("div");
  source.textContent = "mockup";
  const bag = document.createElement("button");
  bag.id = BAG_TARGET_ID;
  document.body.append(source, bag);
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: reduce && query.includes("reduce") }));
  let finish: () => void = () => {};
  const animate = vi.fn(() => ({ finished: new Promise<void>((r) => (finish = r)) }));
  HTMLElement.prototype.animate = animate as unknown as HTMLElement["animate"];
  return { source, animate, finish: () => finish() };
}

afterEach(() => {
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
  Reflect.deleteProperty(HTMLElement.prototype, "animate");
});

describe("flyToBag", () => {
  it("flies a hidden copy to the bag and cleans it up", async () => {
    const { source, animate, finish } = setup();
    const flight = flyToBag(source);
    const ghost = document.body.lastElementChild as HTMLElement;
    expect(ghost).not.toBe(source);
    expect(ghost).toHaveAttribute("aria-hidden", "true");
    expect(ghost.style.position).toBe("fixed");
    expect(animate).toHaveBeenCalledOnce();

    finish();
    await flight;
    expect(document.body.contains(ghost)).toBe(false);
  });

  it("does nothing under reduced motion", async () => {
    const { source, animate } = setup({ reduce: true });
    await flyToBag(source);
    expect(animate).not.toHaveBeenCalled();
    expect(document.body.children).toHaveLength(2);
  });

  it("does nothing without a bag to land on", async () => {
    const { source, animate } = setup();
    document.getElementById(BAG_TARGET_ID)?.remove();
    await flyToBag(source);
    expect(animate).not.toHaveBeenCalled();
  });
});
