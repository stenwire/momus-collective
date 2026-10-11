"use client";

import { useEffect } from "react";
import { loadSession } from "@/lib/auth/api";
import { useAuthStore } from "@/lib/auth/store";

// Asks the API who is signed in; the answer comes from httpOnly cookies.
export function AuthBootstrap() {
  useEffect(() => {
    // Tokens persisted by the pre-cookie build (T-314) must not linger.
    try {
      localStorage.removeItem("momus-auth");
    } catch {}
    loadSession().catch(() => useAuthStore.getState().setSession(null, null));
  }, []);
  return null;
}
