import { config } from "@/lib/config";

/**
 * RSS autodiscovery link. Spread into each page's `alternates.types` (metadata
 * merges shallowly, so a page that sets its own `alternates` would otherwise
 * drop the feed link).
 */
export const rssAlternate = {
  "application/rss+xml": `${config.site.url}/feed.xml`,
} as const;
