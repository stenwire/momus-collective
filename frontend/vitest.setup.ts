import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// next/font only works under Next's compiler; any loader returns a stub
// whose family is the loader's own name.
vi.mock("next/font/google", () => {
  const loader = (name: string) => () => ({
    className: name,
    style: { fontFamily: `'${name}'` },
  });
  const names = [
    "Geist",
    "Geist_Mono",
    "Archivo_Black",
    "Anton",
    "Bebas_Neue",
    "Permanent_Marker",
    "Pacifico",
    "Space_Mono",
    "DM_Serif_Display",
    "Abril_Fatface",
    "Stardos_Stencil",
  ];
  return Object.fromEntries(names.map((name) => [name, loader(name)]));
});

// jsdom has no IntersectionObserver; components that use it (infinite
// scroll) need at least a no-op stub to mount in tests.
class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// @ts-expect-error -- test-only stub, not a spec-complete implementation
global.IntersectionObserver = MockIntersectionObserver;
