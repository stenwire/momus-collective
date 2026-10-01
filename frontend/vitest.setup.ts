import "@testing-library/jest-dom/vitest";

// jsdom has no IntersectionObserver; components that use it (infinite
// scroll) need at least a no-op stub to mount in tests.
class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// @ts-expect-error -- test-only stub, not a spec-complete implementation
global.IntersectionObserver = MockIntersectionObserver;
