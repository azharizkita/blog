import { config } from "@/lib/config";
import cache from "@/lib/cache";
import getSlug from "@/lib/get-slug";
import octokit from "@/lib/octokit";
import parseEntry from "@/lib/parse-entry";

type GistOptions = {
  topic: "Blog" | "Poem" | "Sharing";
};

export const getGistList = cache(
  async (type?: "beeps" | "articles", options?: GistOptions) => {
    const { topic } = options ?? {};

    const { data } = await octokit.rest.gists.listForUser({
      username: config.github.username,
    });

    const _data = data.map(({ description, ...rest }) => {
      const { title, ...restEntryData } = parseEntry(description ?? "");
      const slug = getSlug(title);
      return { ...rest, description, entry: { title, ...restEntryData }, slug };
    });

    if (type === "beeps") {
      return _data.filter((gist) => gist.entry.type === "Beep");
    }

    const articles = _data.filter((gist) => gist.entry.type !== "Beep");

    if (!!topic) {
      return articles.filter((gist) => gist.entry.type === topic);
    }

    return articles;
  },
  ["gist-list"],
  { revalidate: config.cache.defaultTime }
);

export type GistList = Awaited<ReturnType<typeof getGistList>>;

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
  { revalidate: config.cache.defaultTime }
);
