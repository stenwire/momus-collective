import { MutationCache, QueryClient } from "@tanstack/react-query";
import { errorMessages } from "@/lib/auth/api";
import { toast } from "@/lib/toast";

declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: {
      success?: string | ((data: never, variables: never) => string);
      label?: string;
      quiet?: boolean;
    };
  }
}

// Every write reports its outcome: a mutation names its success message in
// `meta`, and any failure surfaces unless the caller reports it itself.
export function makeQueryClient() {
  return new QueryClient({
    mutationCache: new MutationCache({
      onSuccess: (data, variables, _result, mutation) => {
        const { success, label } = mutation.meta ?? {};
        if (!success) return;
        const message = typeof success === "function" ? success(data as never, variables as never) : success;
        toast(message, { tone: "success", label });
      },
      onError: (error, _variables, _result, mutation) => {
        if (mutation.meta?.quiet) return;
        toast(errorMessages(error).join(" "), { tone: "error" });
      },
    }),
  });
}
