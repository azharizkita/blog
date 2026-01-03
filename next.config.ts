import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  redirects: async () => [
    {
      source: "/article",
      destination: "/articles",
      permanent: true,
    },
    {
      source: "/article/:slug",
      destination: "/articles/:slug",
      permanent: true,
    },
  ],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  images: {
    remotePatterns: [
      {
        hostname: "gist.github.com",
      },
      {
        hostname: "github.com",
      },
    ],
  },
};

export default nextConfig;
