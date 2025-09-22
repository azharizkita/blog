import ContentItem from "@/components/content-item";
import { getGistList } from "@/repositories/gist";
import { createPageMetadata } from "@/lib/metadata";

export const dynamic = "force-static";

export const metadata = createPageMetadata({
  title: "Blogs",
  description:
    "A collection of my thoughts, reflections, and stories. Unfiltered, personal, and real—this is where I write about life, experiences, and everything in between.",
  path: "/blog",
});

export default async function Blogs() {
  const list = await getGistList("articles", { topic: "Blog" });

  return (
    <div className="grid auto-rows-min gap-4">
      {list.map((item) => (
        <ContentItem
          key={item.id}
          content={item}
          variant="article"
          showTypeFilter={true}
        />
      ))}
    </div>
  );
}
