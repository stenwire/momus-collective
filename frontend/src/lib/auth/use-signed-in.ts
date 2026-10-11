import { useAuthStore } from "./store";

// null until the session check answers, so nothing flashes the wrong state.
export function useSignedIn(): boolean | null {
  const status = useAuthStore((s) => s.status);
  return status === "unknown" ? null : status === "signed-in";
}
