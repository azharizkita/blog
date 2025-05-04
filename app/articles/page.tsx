import ArticleItem from "@/components/article-item";
import { CategoryTab } from "@/components/category-tab";
import { Skeleton } from "@/components/ui/skeleton";
import { getGistList } from "@/repositories/gist";
import type { Metadata } from "next";
import { Suspense } from "react";

export const dynamic = "force-static";

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

  return (
    <>
      <CategoryTab />
      <div className="grid auto-rows-min gap-4">
        {list.map(({ description, slug, created_at, entry, updated_at }, i) => {
          if (!description) return null;

          return (
            <Suspense
              key={i}
              fallback={<Skeleton className="h-[162px] w-full" />}
            >
              <ArticleItem
                entry={entry}
                createdAt={created_at}
                slug={slug}
                updatedAt={updated_at}
              />
            </Suspense>
          );
        })}
      </div>
    </>
  );
}
