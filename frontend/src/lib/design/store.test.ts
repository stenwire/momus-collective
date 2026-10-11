import { describe, expect, it } from "vitest";
import { designOptions } from "@/test/design-fixtures";
import { sameConfig } from "./store";

describe("sameConfig", () => {
  const a = designOptions.defaults;

  it("ignores key order, as a config round-tripped through Postgres has", () => {
    const reordered = Object.fromEntries(Object.entries(a).reverse()) as typeof a;
    expect(sameConfig(a, reordered)).toBe(true);
  });

  it("notices any changed value", () => {
    expect(sameConfig(a, { ...a, text: "different" })).toBe(false);
  });

  it("treats a missing side as different", () => {
    expect(sameConfig(a, null)).toBe(false);
  });
});
