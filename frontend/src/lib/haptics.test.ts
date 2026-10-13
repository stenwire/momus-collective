import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PATTERNS, haptic, hapticsEnabled, setHapticsEnabled } from "./haptics";

function stubVibrate(impl: (p: VibratePattern) => boolean = () => true) {
  const vibrate = vi.fn(impl);
  Object.defineProperty(navigator, "vibrate", { value: vibrate, configurable: true });
  return vibrate;
}

function stubActivation(isActive: boolean) {
  Object.defineProperty(navigator, "userActivation", {
    value: { isActive },
    configurable: true,
  });
}

afterEach(() => {
  Reflect.deleteProperty(navigator, "vibrate");
  Reflect.deleteProperty(navigator, "userActivation");
  Reflect.deleteProperty(HTMLInputElement.prototype, "switch");
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("haptic on a vibrating device", () => {
  beforeEach(() => stubActivation(true));

  it.each(Object.entries(PATTERNS))("plays the %s pattern", (name, pattern) => {
    const vibrate = stubVibrate();
    expect(haptic(name as keyof typeof PATTERNS)).toBe(true);
    expect(vibrate).toHaveBeenCalledWith(pattern);
  });

  it("does nothing once switched off, and resumes when switched on", () => {
    const vibrate = stubVibrate();
    setHapticsEnabled(false);
    expect(haptic("tick")).toBe(false);
    expect(vibrate).not.toHaveBeenCalled();
    setHapticsEnabled(true);
    expect(haptic("tick")).toBe(true);
  });

  it("does nothing outside a user gesture", () => {
    const vibrate = stubVibrate();
    stubActivation(false);
    expect(haptic("success")).toBe(false);
    expect(vibrate).not.toHaveBeenCalled();
  });

  it("swallows a vibrate that throws", () => {
    stubVibrate(() => {
      throw new Error("blocked");
    });
    expect(haptic("error")).toBe(false);
  });
});

describe("haptic without vibrate", () => {
  it("is a silent no-op on a device with neither vibrate nor a switch", () => {
    expect(haptic("success")).toBe(false);
  });

  it("toggles a hidden native switch on iOS Safari", () => {
    Object.defineProperty(HTMLInputElement.prototype, "switch", {
      value: false,
      configurable: true,
      writable: true,
    });
    expect(haptic("success")).toBe(true);
    const input = document.getElementById("momus-haptic-switch") as HTMLInputElement;
    expect(input.checked).toBe(true);
    expect(input.closest("label")).toHaveAttribute("aria-hidden", "true");
    expect(input.tabIndex).toBe(-1);
  });
});

describe("the on/off preference", () => {
  it("defaults to on and persists off", () => {
    expect(hapticsEnabled()).toBe(true);
    setHapticsEnabled(false);
    expect(localStorage.getItem("momus-haptics")).toBe("off");
    expect(hapticsEnabled()).toBe(false);
  });

  it("stays on and does not throw when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(hapticsEnabled()).toBe(true);
    expect(() => setHapticsEnabled(false)).not.toThrow();
  });
});
