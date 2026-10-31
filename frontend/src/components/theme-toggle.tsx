"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { buttonClasses } from "@/components/ui/button";

type Theme = "dark" | "light";
const STORAGE_KEY = "momus-theme";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getTheme(): Theme {
  if (document.documentElement.dataset.theme === "light") return "light";
  return localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
}

function notify() {
  listeners.forEach((listener) => listener());
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getTheme, () => "dark");

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    if (next === "light") document.documentElement.dataset.theme = "light";
    else delete document.documentElement.dataset.theme;
    localStorage.setItem(STORAGE_KEY, next);
    notify();
  }

  const label = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      aria-pressed={theme === "light"}
      className={buttonClasses({ variant: "secondary", size: "sm" })}
      title={label}
    >
      {theme === "dark" ? <Sun className="size-4" aria-hidden="true" /> : <Moon className="size-4" aria-hidden="true" />}
      <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}