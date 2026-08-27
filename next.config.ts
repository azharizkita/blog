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
  async headers() {
    return [
      {
        // Defense in depth for the dev-only editor: the pages 404 in
        // production and carry noindex meta, but the header also covers
        // any response on these paths (404s included), unlike page meta.
        source: "/editor/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
