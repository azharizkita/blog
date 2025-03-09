import { ArticleItem } from "@/components/article-item";
import getParams from "@/lib/get-params";
import getPathname from "@/lib/get-pathname";
import { getGistList } from "@/repositories/gist";
import type { Metadata } from "next";

export const dynamic = 'force-static'

export const metadata: Metadata = {
  metadataBase: new URL("https://silenced.life"),
  title: "Silenced | Beeps",
  description:
    "Beeps is a space to express fleeting thoughts—when there's no one to talk to, when the mind feels heavy, or just to let things out. A personal stream of consciousness, without filters.",
  openGraph: {
    url: "https://silenced.life/beeps",
    siteName: "Silenced | Beeps",
    images: [{ url: "/api/og?title=Beeps" }],
  },
};

export default async function Beeps() {
  const list = await getGistList("beeps");
  const pathname = await getPathname();
  const type = (await getParams()).get("type") ?? "";

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
