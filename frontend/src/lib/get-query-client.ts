import { QueryClient } from "@tanstack/react-query";
import { cache } from "react";

// One QueryClient per server request (React's cache() dedupes within a
// single render), never shared across requests the way a module-level
// singleton would be.
export const getQueryClient = cache(() => new QueryClient());
