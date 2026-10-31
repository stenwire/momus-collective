import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CategoryFilter } from "@/components/catalog/category-filter";
import { CollectionCarousel } from "@/components/catalog/collection-carousel";
import { ShirtCanvas } from "@/components/design/shirt-canvas";
import type { Collection } from "@/lib/api";
import { haptic } from "@/lib/haptics";
import { TOAST_MS, pauseToast, resumeToast, toast, useToasts } from "@/lib/toast";
import { designOptions } from "@/test/design-fixtures";
import { KineticText } from "./kinetic-text";
import { ProductModal } from "@/components/catalog/product-modal";

vi.mock("next/navigation", () => ({ useRouter: () => ({ back: vi.fn() }), usePathname: () => "/" }));

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  useToasts.setState({ toasts: [] });
});

describe("T-619: the iOS haptic stays inside its hidden switch", () => {
  it("never reaches document click listeners", () => {
    Object.defineProperty(HTMLInputElement.prototype, "switch", {
      value: false,
      configurable: true,
      writable: true,
    });
    const outside = vi.fn();
    document.addEventListener("click", outside);
    expect(haptic("tick")).toBe(true);
    document.removeEventListener("click", outside);
    Reflect.deleteProperty(HTMLInputElement.prototype, "switch");
    expect(outside).not.toHaveBeenCalled();
  });
});

describe("T-621: toasts wait while someone is reading them", () => {
  it("pauses on hover or focus and resumes with the time left", () => {
    vi.useFakeTimers();
    const id = toast("Removed.");
    act(() => vi.advanceTimersByTime(TOAST_MS - 1000));
    pauseToast(id);
    act(() => vi.advanceTimersByTime(TOAST_MS * 3));
    expect(useToasts.getState().toasts).toHaveLength(1);
    resumeToast(id);
    act(() => vi.advanceTimersByTime(999));
    expect(useToasts.getState().toasts).toHaveLength(1);
    act(() => vi.advanceTimersByTime(2));
    expect(useToasts.getState().toasts).toHaveLength(0);
  });
});

describe("T-620: kinetic words keep their descenders", () => {
  it("pads each word's mask below and cancels it with a negative margin", () => {
    const { container } = render(<KineticText text="dressed up" />);
    const mask = container.querySelector('[aria-hidden="true"] > span') as HTMLElement;
    expect(mask).toHaveClass("pb-[0.15em]", "-mb-[0.15em]", "overflow-hidden");
  });
});

describe("T-623: the product modal's close button floats over its content", () => {
  it("takes no height and lets clicks through except on the button", () => {
    render(
      <ProductModal>
        <p>content</p>
      </ProductModal>,
    );
    const row = screen.getByRole("button", { name: "Close" }).parentElement!.parentElement!;
    expect(row).toHaveClass("-mb-[3.25rem]", "pointer-events-none");
    expect(screen.getByRole("button", { name: "Close" }).parentElement).toHaveClass("pointer-events-auto");
  });
});

describe("T-625: the carousel count is not part of the heading's name", () => {
  it("reads the heading as the collection name", () => {
    const collection = {
      id: "1",
      name: "Top Rated",
      slug: "top-rated",
      is_featured: true,
      products: [{ id: "p", slogan: "x", slug: "x", category: { id: "c", name: "C", slug: "c" }, price: 1, mockup_images: [], tags: [], total_orders: 0, avg_rating: "0", review_count: 0, created_at: "" }],
    } as unknown as Collection;
    render(<CollectionCarousel collection={collection} />);
    expect(screen.getByRole("heading", { name: "Top Rated" })).toBeInTheDocument();
  });
});

describe("T-626: centring the active chip never scrolls the page", () => {
  it("sets the row's scrollLeft and never calls scrollIntoView", async () => {
    const intoView = vi.fn();
    Element.prototype.scrollIntoView = intoView;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ all_count: 1, categories: [{ id: "c", name: "Tech", slug: "tech", product_count: 1 }] }),
      })),
    );
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <CategoryFilter selected="tech" onSelect={() => {}} />
      </QueryClientProvider>,
    );
    await screen.findByRole("button", { name: "Tech (1)" });
    expect(intoView).not.toHaveBeenCalled();
  });
});

describe("T-627: a canvas tween sizes the canvas once", () => {
  let frames: FrameRequestCallback[] = [];
  beforeEach(() => {
    frames = [];
    vi.stubGlobal("Path2D", class {});
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => frames.push(cb));
    vi.stubGlobal("cancelAnimationFrame", () => {});
  });

  it("resizes the backing store once, then only redraws each frame", () => {
    const ctx = {
      clearRect: vi.fn(), fill: vi.fn(), stroke: vi.fn(), strokeRect: vi.fn(), setLineDash: vi.fn(),
      setTransform: vi.fn(), createLinearGradient: () => ({ addColorStop: vi.fn() }),
      measureText: () => ({ width: 10 }), fillText: vi.fn(), fillStyle: "", globalAlpha: 1,
    };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx as never);
    const widthSet = vi.spyOn(HTMLCanvasElement.prototype, "width", "set");
    const { rerender } = render(
      <ShirtCanvas config={designOptions.defaults} options={designOptions} label="shirt" />,
    );
    widthSet.mockClear();
    rerender(
      <ShirtCanvas
        config={{ ...designOptions.defaults, shirt_color: "White" }}
        options={designOptions}
        label="shirt"
      />,
    );
    const start = performance.now();
    for (let i = 1; i <= 20 && frames.length; i++) frames.shift()!(start + i * 16);
    expect(ctx.clearRect.mock.calls.length).toBeGreaterThan(3);
    expect(widthSet).toHaveBeenCalledTimes(1);
  });
});
