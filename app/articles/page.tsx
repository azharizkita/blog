import { ArticleItem } from "@/components/article-item";
import getParams from "@/lib/get-params";
import getPathname from "@/lib/get-pathname";
import { getGistList } from "@/repositories/gist";
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://silenced.life"),
  title: "Silenced | Articles",
  description:
    "A collection of my thoughts, reflections, and stories. Unfiltered, personal, and real—this is where I write about life, experiences, and everything in between.",
  openGraph: {
    url: "https://silenced.life/articles",
    siteName: "Silenced | Articles",
    images: [{ url: "/api/og?title=Articles" }],
  },
};

export default async function Articles() {
  const list = await getGistList("articles");
  const pathname = await getPathname();
  const type = (await getParams()).get("type") ?? "";

  return (
    <div className="grid auto-rows-min gap-6 ">
      {list.map(({ description, slug, created_at, entry }, i) => {
        if (!description) return null;

        return (
          <ArticleItem
            key={i}
            type={type}
            pathname={pathname}
            entry={entry}
            createdAt={created_at}
            slug={slug}
          />
        );
      })}
    </div>
  );
}
