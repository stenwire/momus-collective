import type { NextConfig } from "next";

// Repo-local telemetry opt-out. `next telemetry disable` writes to a
// machine-global config that CI and other developers never inherit.
process.env.NEXT_TELEMETRY_DISABLED ??= "1";

const nextConfig: NextConfig = {};

export default nextConfig;
