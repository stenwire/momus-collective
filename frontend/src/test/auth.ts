import { useAuthStore } from "@/lib/auth/store";

export const testUser = { email: "ada@example.com", first_name: "Ada" };

export function signedIn() {
  useAuthStore.setState({ status: "signed-in", user: testUser, csrf: "csrf-token" });
}

export function signedOut() {
  useAuthStore.setState({ status: "signed-out", user: null, csrf: "csrf-token" });
}
