import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  allowedDevOrigins: ['lokey-mac.gate-scylla.ts.net'],
  images: {
    remotePatterns: [
      // Gist markdown attachments (e.g. gist.github.com/user-attachments/assets/…)
      { protocol: "https", hostname: "gist.github.com" },
      { protocol: "https", hostname: "github.com" },
      // Attachment/avatar/raw CDNs those URLs redirect to
      { protocol: "https", hostname: "**.githubusercontent.com" },
    ],
  },
};

export default nextConfig;
