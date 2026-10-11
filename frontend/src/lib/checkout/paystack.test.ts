import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type CheckoutStart, openPaystack } from "./paystack";

const start: CheckoutStart = {
  reference: "MOMPAY-abc",
  amount: 2300000,
  email: "g@example.com",
  public_key: "pk_test_x",
  channels: ["card", "bank_transfer"],
};

function fakePopup(react: (t: Record<string, (...a: unknown[]) => void>) => void) {
  const seen: Record<string, unknown>[] = [];
  window.PaystackPop = class {
    newTransaction(t: Record<string, unknown>) {
      seen.push(t);
      react(t as Record<string, (...a: unknown[]) => void>);
    }
  } as never;
  return seen;
}

describe("openPaystack", () => {
  beforeEach(() => {
    window.PaystackPop = undefined;
  });
  afterEach(() => {
    window.PaystackPop = undefined;
  });

  it("opens Inline with the server's key, amount, reference and all three channels", async () => {
    const seen = fakePopup((t) => t.onSuccess({ reference: "MOMPAY-abc" }));
    await expect(openPaystack(start)).resolves.toEqual({ kind: "success", reference: "MOMPAY-abc" });
    expect(seen[0]).toMatchObject({
      key: "pk_test_x",
      email: "g@example.com",
      amount: 2300000,
      reference: "MOMPAY-abc",
      channels: ["card", "bank_transfer"],
    });
  });

  it("reports a cancelled popup", async () => {
    fakePopup((t) => t.onCancel());
    await expect(openPaystack(start)).resolves.toEqual({ kind: "cancelled" });
  });

  it("reports a failed payment with Paystack's message", async () => {
    fakePopup((t) => t.onError({ message: "Card declined." }));
    await expect(openPaystack(start)).resolves.toEqual({ kind: "error", message: "Card declined." });
  });

  it("loads the Paystack script when it isn't there yet", async () => {
    const appended = vi.spyOn(document.head, "appendChild").mockImplementation((node) => {
      fakePopup((t) => t.onCancel());
      (node as HTMLScriptElement).onload?.(new Event("load"));
      return node;
    });
    await expect(openPaystack(start)).resolves.toEqual({ kind: "cancelled" });
    expect((appended.mock.calls[0][0] as HTMLScriptElement).src).toBe("https://js.paystack.co/v2/inline.js");
    appended.mockRestore();
  });
});
