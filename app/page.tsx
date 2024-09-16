import PostEntry from "@/components/PostEntry";
import { getGistList } from "@/repositories/gist";
import Script from "next/script";
import type { Blog, WithContext } from "schema-dts";

const jsonLd: WithContext<Blog> = {
  "@context": "https://schema.org",
  "@type": "Blog",
  name: "Silenced",
  image: "https://silenced.life/api/og",
  description: `Personal dumps by ${process.env.GITHUB_USERNAME}`,
};

export default async function Home() {
  const list = await getGistList();

  return (
    <>
      <Script type="application/ld+json" id="schema">
        {JSON.stringify(jsonLd)}
      </Script>
      {list.map(({ description, slug, created_at, entry }, i) => {
        if (!description) return null;

        return (
          <PostEntry
            key={i}
            entry={entry}
            description={description}
            createdAt={created_at}
            slug={slug}
          />
        );
      })}
    </>
  );
}
