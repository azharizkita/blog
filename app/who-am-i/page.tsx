import ArticleContent from "@/components/article-content";
import { getAbout } from "@/repositories/about";
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://silenced.life"),
  title: "Silenced | Who am I",
  description:
    "A human—just like you. I tell stories. Sometimes with words, sometimes with metaphors, but always from the heart. And I code too.",
  openGraph: {
    url: "https://silenced.life/who-am-i",
    siteName: "Silenced | Stats",
    images: [{ url: "/api/og?title=Who am I" }],
  },
};

export default async function WhoAmI() {
  const content = await getAbout();

  if (!content) return null;

  return <ArticleContent content={content} />;
}
