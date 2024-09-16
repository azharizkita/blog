import { DEFAULT_CACHE_TIME } from "@/constants";
import { cache, octokit, parseEntry } from "@/utils";
import getSlug from "@/utils/get-slug";

export const getGistList = cache(
  async () => {
    const { data } = await octokit.rest.gists.listForUser({
      username: "azharizkita",
    });
    
    return data.map(({ description, ...rest }) => {
      const { title, ...restEntryData } = parseEntry(description ?? "");
      const slug = getSlug(title);
      return { ...rest, description, entry: { title, ...restEntryData }, slug };
    });
  },
  ["gist-list"],
  { revalidate: DEFAULT_CACHE_TIME }
);

export const getGistDetails = cache(
  async (slug: string) => {
    const list = await getGistList();
    const gistDetails = list.find((item) => item.slug === slug);

    if (!gistDetails) {
      return null;
    }

    const { data } = await octokit.rest.gists.get({ gist_id: gistDetails.id });

    const { title, ...restEntryData } = parseEntry(data.description ?? "");

    return { ...data, entry: { title, ...restEntryData } };
  },
  ["gist-details"],
  { revalidate: DEFAULT_CACHE_TIME }
);
