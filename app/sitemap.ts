import type { MetadataRoute } from "next";

import { getGistList } from "@/repositories/gist";
import { config } from "@/lib/config";

const TYPES = ["blog", "poem", "sharing", "literature"] as const;

function toDate(value?: string | null) {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

/** Newest modification date within a set of entries, for `lastModified`. */
function latestOf(entries: { updated_at?: string | null; created_at?: string | null }[]) {
  return entries.reduce<Date | undefined>((acc, entry) => {
    const date = toDate(entry.updated_at ?? entry.created_at);
    return date && (!acc || date > acc) ? date : acc;
  }, undefined);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await getGistList("articles");
  const base = config.site.url;

  const home: MetadataRoute.Sitemap[number] = {
    url: base,
    lastModified: latestOf(articles),
    changeFrequency: "daily",
    priority: 1,
  };

  const typePages: MetadataRoute.Sitemap = TYPES.flatMap((type) => {
    const entries = articles.filter(
      (gist) => gist.entry.type.toLowerCase() === type,
    );
    if (entries.length === 0) return [];
    return [
      {
        url: `${base}/${type}`,
        lastModified: latestOf(entries),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      },
    ];
  });

  const articlePages: MetadataRoute.Sitemap = articles.map((gist) => ({
    url: `${base}/${gist.entry.type.toLowerCase()}/${gist.slug}`,
    lastModified: toDate(gist.updated_at ?? gist.created_at),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [home, ...typePages, ...articlePages];
}
