import { getGistList } from "@/repositories/gist";
import type { MetadataRoute } from "next";

const url = "https://silenced.life";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const list = await getGistList("articles");
  const articleSitemap: MetadataRoute.Sitemap = list.map(
    ({ slug, updated_at }) => {
      return {
        url: `${url}/articles/${slug}`,
        lastModified: new Date(updated_at),
        changeFrequency: "weekly",
        priority: 0.75,
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
    {
      url: `${url}/stats`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.5,
    },
    {
      url: `${url}/who-am-i`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.5,
    },
    {
      url: `${url}/beeps`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.5,
    },
    {
      url: `${url}/articles`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.75,
    },
    ...articleSitemap,
  ];
}
