import type { NextConfig } from "next";

// Repo-local telemetry opt-out. `next telemetry disable` writes to a
// machine-global config that CI and other developers never inherit.
process.env.NEXT_TELEMETRY_DISABLED ??= "1";

const apiUrl = new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000");

const nextConfig: NextConfig = {
  images: {
    // Design mockups are served by the API; local addresses are blocked
    // by the optimizer unless allowed, which only dev needs.
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== "production",
    // No dedicated image host exists yet -- Product.mockup_images is
    // admin-entered URL strings (D-062). next/image still re-encodes to
    // WebP/AVIF and lazy-loads regardless of source host.
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      {
        protocol: apiUrl.protocol.replace(":", "") as "http" | "https",
        hostname: apiUrl.hostname,
        port: apiUrl.port,
      },
    ],
  },
};

export default nextConfig;
