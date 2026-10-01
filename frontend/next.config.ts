import type { NextConfig } from "next";

// Repo-local telemetry opt-out. `next telemetry disable` writes to a
// machine-global config that CI and other developers never inherit.
process.env.NEXT_TELEMETRY_DISABLED ??= "1";

const nextConfig: NextConfig = {
  images: {
    // No dedicated image host exists yet -- Product.mockup_images is
    // admin-entered URL strings (D-062). next/image still re-encodes to
    // WebP/AVIF and lazy-loads regardless of source host.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
