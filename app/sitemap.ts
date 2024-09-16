import { getGistList } from "@/repositories/gist";
import type { MetadataRoute } from "next";

const url = "https://silenced.life";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const list = await getGistList();
  const articleSitemap: MetadataRoute.Sitemap = list.map(
    ({ slug, updated_at }) => {
      return {
        url: `${url}/article/${slug}`,
        lastModified: new Date(updated_at),
        changeFrequency: "weekly",
        priority: 0.5,
      };
    }
  );

  return [
    {
      url,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.25,
    },
    ...articleSitemap,
  ];
}