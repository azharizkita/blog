import type { Metadata } from "next";
import Image from "next/image";
import { getGistList } from "@/repositories/gist";
import { getSiteCopy } from "@/repositories/settings";
import { config } from "@/lib/config";
import { JsonLd } from "@/components/json-ld";
import { blogNode, graph, personNode, websiteNode } from "@/lib/structured-data";
import { rssAlternate } from "@/lib/metadata";
import { Feed } from "@/components/feed";
import { FeaturedCarousel } from "@/components/featured-carousel";

// Title/description/openGraph are inherited from the root layout, whose
// openGraph.url already points at the site root (this page). Only the
// canonical needs to be pinned here.
export const metadata: Metadata = {
  alternates: { canonical: "/", types: rssAlternate },
};

const byCreatedDesc = (
  a: { created_at?: string | null },
  b: { created_at?: string | null },
) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();

export default async function Home() {
  const articles = await getGistList("articles");
  const { siteDescription } = await getSiteCopy();
  const sorted = [...articles].sort(byCreatedDesc);
  const featured = sorted.filter((gist) => gist.entry.featured);

  return (
    <>
      <JsonLd data={graph(personNode(), websiteNode(), blogNode())} />

      <section className="mx-auto max-w-[520px] space-y-4 pt-8 text-center">
        <Image
          src="/icon.svg"
          alt=""
          width={96}
          height={96}
          className="mx-auto"
          priority
        />
        {/* The nav and icon already carry the identity; keep the h1 for the
            page's heading structure (exactly one h1) without repeating the
            name visually. */}
        <h1 className="sr-only">{config.site.name}</h1>
        <p className="prose-lead">{siteDescription}</p>
      </section>

      {featured.length > 0 && (
        <section className="space-y-6">
          <h2 className="prose-h2">Featured</h2>
          <FeaturedCarousel gists={featured} />
        </section>
      )}

      <section className="space-y-6">
        <h2 className="sr-only">Latest</h2>
        <Feed gists={sorted} />
      </section>
    </>
  );
}
