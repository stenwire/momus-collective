import { useSyncExternalStore } from "react";
import { useAuthStore } from "./store";

const noop = () => () => {};

// Tokens live in localStorage, which the server render can't see: report
// signed-out until mounted so the first client render matches the server.
export function useSignedIn(): boolean | null {
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const signedIn = useAuthStore((s) => s.tokens !== null);
  return mounted ? signedIn : null;
}
