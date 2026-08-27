import type { MetadataRoute } from "next";

import { config } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The dev-only editor 404s in production, but keep crawlers away from
      // the paths entirely in case a deployment ever serves them.
      disallow: "/editor",
    },
    sitemap: `${config.site.url}/sitemap.xml`,
    host: config.site.url,
  };
}
