import octokit from "@/lib/octokit";
import cache from "@/lib/cache";
import { config } from "@/lib/config";

export const getAbout = cache(
  async (): Promise<string | null> => {
    try {
      const { data } = await octokit.rest.repos.getReadme({
        owner: config.github.username,
        repo: config.github.username,
      });

      const content = Buffer.from(data.content, "base64").toString("utf-8");

      return content;
    } catch (err: any) {
      if (err.status === 404) return null;
      throw err;
    }
  },
  ["profile-readme"],
  { revalidate: config.cache.defaultTime }
);
