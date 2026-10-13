"use client";

import { useCallback, useSyncExternalStore } from "react";

export type HapticPattern = "tick" | "success" | "warning" | "error";

export const PATTERNS: Record<HapticPattern, number | number[]> = {
  tick: 8,
  success: [12, 40, 18],
  warning: [30, 60, 30],
  error: [40, 30, 40, 30, 40],
};

const STORAGE_KEY = "momus-haptics";
const listeners = new Set<() => void>();

export function hapticsEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setHapticsEnabled(on: boolean) {
  try {
    if (on) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, "off");
  } catch {
    // Storage blocked (private mode): the choice lasts for this page only.
  }
  listeners.forEach((notify) => notify());
}

function canVibrate(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

function hasSwitchInput(): boolean {
  return typeof document !== "undefined" && "switch" in document.createElement("input");
}

export function hapticsSupported(): boolean {
  return canVibrate() || hasSwitchInput();
}

// Vibration is only honoured inside a user gesture; skip it otherwise
// rather than let the browser log an intervention.
function inUserGesture(): boolean {
  const activation = (navigator as Navigator & { userActivation?: { isActive: boolean } })
    .userActivation;
  return activation ? activation.isActive : true;
}

let switchLabel: HTMLLabelElement | null = null;

// iOS Safari has no vibrate, but toggling a native switch plays the
// system tick (iOS 18+). The control is invisible and out of the a11y tree.
function iosTick() {
  if (!switchLabel || !switchLabel.isConnected) {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("switch", "");
    input.id = "momus-haptic-switch";
    input.tabIndex = -1;
    switchLabel = document.createElement("label");
    switchLabel.htmlFor = input.id;
    switchLabel.setAttribute("aria-hidden", "true");
    switchLabel.style.cssText =
      "position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden;";
    switchLabel.append(input);
    document.body.append(switchLabel);
  }
  switchLabel.click();
}

export function haptic(pattern: HapticPattern): boolean {
  if (typeof window === "undefined" || !hapticsEnabled() || !inUserGesture()) {
    return false;
  }
  try {
    if (canVibrate()) return navigator.vibrate(PATTERNS[pattern]);
    if (hasSwitchInput()) {
      iosTick();
      return true;
    }
  } catch {
    // A refused vibration is never worth surfacing.
  }
  return false;
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  window.addEventListener("storage", notify);
  return () => {
    listeners.delete(notify);
    window.removeEventListener("storage", notify);
  };
}

export function useHaptics() {
  const enabled = useSyncExternalStore(subscribe, hapticsEnabled, () => true);
  const supported = useSyncExternalStore(subscribe, hapticsSupported, () => false);
  const fire = useCallback((pattern: HapticPattern) => haptic(pattern), []);
  return { haptic: fire, enabled, supported, setEnabled: setHapticsEnabled };
}
