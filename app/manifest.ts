import type { MetadataRoute } from "next";

import { config } from "@/lib/config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: config.site.name,
    short_name: config.site.name,
    description: config.site.description,
    start_url: "/",
    display: "browser",
    background_color: "#ffffff",
    theme_color: "#0a0a0a",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
