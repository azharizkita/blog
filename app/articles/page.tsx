import ContentItem from "@/components/content-item";
import { getGistList } from "@/repositories/gist";
import { createPageMetadata } from "@/lib/metadata";

export const dynamic = "force-static";

export const metadata = createPageMetadata({
  title: "Articles",
  description: "A collection of my thoughts, reflections, and stories. Unfiltered, personal, and real—this is where I write about life, experiences, and everything in between.",
  path: "/articles"
});

interface ArticlesPageProps {
  searchParams: Promise<{ type?: string }>;
}

export default async function Articles({ searchParams }: ArticlesPageProps) {
  const { type } = await searchParams;
  const list = await getGistList("articles");

  const filteredList = type ? list.filter((item) => item.entry.type === type) : list;

  return (
    <div className="grid auto-rows-min gap-4">
      {filteredList.map((item) => (
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
