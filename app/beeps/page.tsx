import { ArticleItem } from "@/components/article-item";
import { getGistList } from "@/repositories/gist";
import { Suspense } from "react";

export default async function Beeps() {
  const list = await getGistList("beeps");

  return (
    <div className="grid auto-rows-min gap-6 ">
      {list.map(({ description, slug, created_at, entry }, i) => {
        if (!description) return null;

        return (
          <Suspense key={i}>
            <ArticleItem
              entry={entry}
              description={description}
              createdAt={created_at}
              slug={slug}
            />
          </Suspense>
        );
      })}
    </div>
  );
}
