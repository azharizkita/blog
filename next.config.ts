import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  allowedDevOrigins: ['lokey-mac.gate-scylla.ts.net'],
  images: {
    localPatterns: [
      // The OG endpoint is the featured-carousel card art; it needs its
      // ?title= query. (Next 16 blocks query strings on local images unless
      // explicitly allowed; omitting `search` allows any query.)
      { pathname: "/api/og" },
      // Everything else local (static imports like the blur placeholder)
      // stays query-less.
      { pathname: "/**", search: "" },
    ],
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
