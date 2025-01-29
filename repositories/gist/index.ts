import { DEFAULT_CACHE_TIME } from "@/constants";
import cache from "@/lib/cache";
import getSlug from "@/lib/get-slug";
import octokit from "@/lib/octokit";
import parseEntry from "@/lib/parse-entry";

export const getGistList = cache(
  async (type?: "beeps" | "articles") => {
    const { data } = await octokit.rest.gists.listForUser({
      username: "azharizkita",
    });

    const _data = data.map(({ description, ...rest }) => {
      const { title, ...restEntryData } = parseEntry(description ?? "");
      const slug = getSlug(title);
      return { ...rest, description, entry: { title, ...restEntryData }, slug };
    });

    if (type === "beeps") {
      return _data.filter((gist) => gist.entry.type === "Beep");
    }

    if (type === "articles") {
      return _data.filter((gist) => gist.entry.type !== "Beep");
    }

    return _data;
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
