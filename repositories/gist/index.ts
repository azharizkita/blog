import { cacheLife, cacheTag } from "next/cache";
import { config } from "@/lib/config";
import getSlug from "@/lib/get-slug";
import octokit from "@/lib/octokit";
import parseEntry from "@/lib/parse-entry";

type GistOptions = {
  topic: "Blog" | "Poem" | "Sharing" | "Literature";
};

export const getGistList = async (
  type?: "beeps" | "articles",
  options?: GistOptions,
) => {
  "use cache";
  cacheLife({ revalidate: config.cache.defaultTime }); // 12h, matches old cache wrapper
  cacheTag("gists");

  const { topic } = options ?? {};

  const { data } = await octokit.rest.gists.listForUser({
    username: config.github.username,
  });

  // Skip gists whose description can't be parsed (e.g. an unknown type) so a
  // single malformed entry doesn't break the whole list.
  const _data = data.flatMap(({ description, ...rest }) => {
    try {
      const { title, ...restEntryData } = parseEntry(description ?? "");
      const slug = getSlug(title);
      return [{ ...rest, description, entry: { title, ...restEntryData }, slug }];
    } catch {
      return [];
    }
  });

  if (type === "beeps") {
    return _data.filter((gist) => gist.entry.type === "Beep");
  }

  const articles = _data.filter((gist) => gist.entry.type !== "Beep");

  if (!!topic) {
    return articles.filter((gist) => gist.entry.type === topic);
  }

  return articles;
};

export type GistList = Awaited<ReturnType<typeof getGistList>>;

export const getGistDetails = async (slug: string) => {
  "use cache";
  cacheLife({ revalidate: config.cache.defaultTime }); // 12h
  cacheTag("gists", `gist:${slug}`);

  const list = await getGistList();
  const gistDetails = list.find((item) => item.slug === slug);

  if (!gistDetails) {
    return null;
  }

  const { data } = await octokit.rest.gists.get({ gist_id: gistDetails.id });

  const { title, ...restEntryData } = parseEntry(data.description ?? "");

  return { ...data, entry: { title, ...restEntryData } };
};
