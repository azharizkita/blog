import { ArticleItem } from "@/components/article-item";
import getParams from "@/lib/get-params";
import getPathname from "@/lib/get-pathname";
import { getGistList } from "@/repositories/gist";

export default async function Beeps() {
  const list = await getGistList("beeps");
  const pathname = await getPathname()
  const type = (await getParams()).get("type") ?? ''

  return (
    <div className="grid auto-rows-min gap-6 ">
      {list.map(({ description, slug, created_at, entry }, i) => {
        if (!description) return null;

        return (
          <ArticleItem
            key={i}
            entry={entry}
            pathname={pathname}
            type={type}
            createdAt={created_at}
            slug={slug}
          />
        );
      })}
    </div>
  );
}
