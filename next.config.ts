import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: "gist.github.com",
      },
    ],
  },
};

export default nextConfig;
