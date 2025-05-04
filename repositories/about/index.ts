import octokit from "@/lib/octokit";
import cache from "@/lib/cache";
import { DEFAULT_CACHE_TIME } from "@/constants";

export const getAbout = cache(
  async (): Promise<string | null> => {
    const {
      data: { login },
    } = await octokit.rest.users.getAuthenticated();

    try {
      const { data } = await octokit.rest.repos.getReadme({
        owner: login,
        repo: login,
      });

      const content = Buffer.from(data.content, "base64").toString("utf-8");

      return content;
    } catch (err: any) {
      if (err.status === 404) return null;
      throw err;
    }
  },
  ["profile-readme"],
  { revalidate: DEFAULT_CACHE_TIME }
);
