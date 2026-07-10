import type { Metadata } from "next";
import { config } from "@/lib/config";

/**
 * RSS autodiscovery link. Spread into each page's `alternates.types` (metadata
 * merges shallowly, so a page that sets its own `alternates` would otherwise
 * drop the feed link).
 */
export const rssAlternate = {
  "application/rss+xml": `${config.site.url}/feed.xml`,
} as const;

interface PageMetadataOptions {
  title: string;
  description: string;
  path?: string;
}

export function createPageMetadata({
  title,
  description,
  path,
}: PageMetadataOptions): Metadata {
  const url = path ? `${config.site.url}${path}` : config.site.url;

  return {
    metadataBase: new URL(config.site.url),
    title: `${config.site.name} | ${title}`,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      url,
      siteName: `${config.site.name} | ${title}`,
      images: [{ url: `/api/og?title=${encodeURIComponent(title)}` }],
    },
  };
}

export const defaultMetadata = createPageMetadata({
  title: "Welcome",
  description: `Personal dumps by ${config.author.name}`,
});
