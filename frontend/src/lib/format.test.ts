import { describe, expect, it } from "vitest";
import { formatNaira } from "./format";

describe("formatNaira", () => {
  it("shows whole naira without kobo, and kobo only when there are some", () => {
    expect(formatNaira(2300000)).toBe("₦23,000");
    expect(formatNaira(52031)).toBe("₦520.31");
    expect(formatNaira(2352031)).toBe("₦23,520.31");
  });
});
