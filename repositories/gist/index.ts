import { DEFAULT_CACHE_TIME } from "@/constants";
import { cache, octokit } from "@/utils";

export const getGistList = cache(
  async () => {
    const list = await octokit.rest.gists.listForUser({
      username: "azharizkita",
    });
    return list;
  },
  ["gist-list"],
  { revalidate: DEFAULT_CACHE_TIME }
);

export const getGistDetails = cache(
  async (gistId: string) => {
    const gist = await octokit.rest.gists.get({ gist_id: gistId });
    return gist;
  },
  ["gist-details"],
  { revalidate: DEFAULT_CACHE_TIME }
);

export const getGistContent = cache(
  async (text: string) => {
    const content = await octokit.rest.markdown.render({
      text,
    });

    return content;
  },
  ["gist-content"],
  { revalidate: DEFAULT_CACHE_TIME }
);
