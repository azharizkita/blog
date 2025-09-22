import ArticleContent from "@/components/article-content";
import { getAbout } from "@/repositories/about";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "Who am I",
  description: "A human—just like you. I tell stories. Sometimes with words, sometimes with metaphors, but always from the heart. And I code too.",
  path: "/who-am-i"
});

export default async function WhoAmI() {
  const content = await getAbout();

  if (!content) return null;

  return <ArticleContent content={content} />;
}
