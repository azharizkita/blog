import { cacheLife, cacheTag } from "next/cache";
import { config } from "@/lib/config";
import type { ContentTopic } from "@/lib/content-types";
import getSlug from "@/lib/get-slug";
import octokit from "@/lib/octokit";
import parseEntry from "@/lib/parse-entry";

type GistOptions = {
  topic: ContentTopic;
};

export const getGistList = async (
  type?: "beeps" | "articles",
  options?: GistOptions,
) => {
  "use cache";
  cacheLife({ revalidate: config.cache.defaultTime }); // 12h, matches old cache wrapper
  cacheTag("gists");

  const { topic } = options ?? {};

  // Paginate: listForUser caps at 30 gists per page, and past that limit
  // older entries would silently vanish from the nav, sitemap, and feed.
  const data = await octokit.paginate(octokit.rest.gists.listForUser, {
    username: config.github.username,
    per_page: 100,
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

// ---------------------------------------------------------------------------
// Editor-only helpers. Deliberately uncached: the editor must see fresh state,
// including secret drafts, which the public site's listForUser never returns.

export const listAllGists = async () => {
  // gists.list = the authenticated user's gists, secret ones included.
  const data = await octokit.paginate(octokit.rest.gists.list, {
    per_page: 100,
  });

  return data.flatMap(({ description, ...rest }) => {
    try {
      const { title, ...restEntryData } = parseEntry(description ?? "");
      return [
        {
          ...rest,
          description,
          entry: { title, ...restEntryData },
          slug: getSlug(title),
        },
      ];
    } catch {
      // Non-article gists (code snippets etc.) don't belong in the editor.
      return [];
    }
  });
};

export const getGistById = async (gistId: string) => {
  const { data } = await octokit.rest.gists.get({ gist_id: gistId });
  return data;
};

export const createGist = async (args: {
  description: string;
  content: string;
  isPublic: boolean;
}) => {
  const { data } = await octokit.rest.gists.create({
    description: args.description,
    public: args.isPublic,
    files: { "index.md": { content: args.content } },
  });
  return data;
};

export const updateGist = async (
  gistId: string,
  args: { description: string; content: string },
) => {
  const { data } = await octokit.rest.gists.update({
    gist_id: gistId,
    description: args.description,
    files: { "index.md": { content: args.content } },
  });
  return data;
};

export const deleteGist = async (gistId: string) => {
  await octokit.rest.gists.delete({ gist_id: gistId });
};
