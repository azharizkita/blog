import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  allowedDevOrigins: ['lokey-mac.gate-scylla.ts.net'],
  experimental: {
    serverActions: {
      // Editor image uploads (uploadEditorImage) accept up to 5 MB, sent as
      // base64 (×4/3 ≈ 6.7 MB) plus action-encoding overhead. The default
      // 1 MB rejects most real screenshots before the action even runs.
      bodySizeLimit: "8mb",
    },
  },
  images: {
    // Cover images live at content-hashed URLs (blog-assets repo) that can
    // never change content, but raw.githubusercontent sends max-age=300 —
    // without a floor, the optimizer re-fetches every 5 minutes and
    // visitors keep paying the cold path. 31 days.
    minimumCacheTTL: 2678400,
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
