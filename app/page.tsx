import type { Metadata } from "next";
import Link from "next/link";
import { getGistList } from "@/repositories/gist";
import { formatDate } from "@/lib/format-date";
import { config } from "@/lib/config";
import { JsonLd } from "@/components/json-ld";
import { blogNode, graph, personNode, websiteNode } from "@/lib/structured-data";
import { rssAlternate } from "@/lib/metadata";

const LATEST_COUNT = 3;

// Title/description/openGraph are inherited from the root layout, whose
// openGraph.url already points at the site root (this page). Only the
// canonical needs to be pinned here.
export const metadata: Metadata = {
  alternates: { canonical: "/", types: rssAlternate },
};

export default async function Home() {
  const articles = await getGistList("articles");

  const latest = [...articles]
    .sort(
      (a, b) =>
        new Date(b.created_at ?? 0).getTime() -
        new Date(a.created_at ?? 0).getTime(),
    )
    .slice(0, LATEST_COUNT);

  return (
    <>
      <JsonLd data={graph(personNode(), websiteNode(), blogNode())} />

      <section className="space-y-2">
        <h1 className="prose-h1">{config.site.name}</h1>
        <p className="prose-lead">{config.site.description}</p>
      </section>

      <section className="space-y-6">
        <h2 className="prose-h2">Latest</h2>

        {latest.length === 0 ? (
          <p className="prose-muted">No entries yet.</p>
        ) : (
          <ul className="space-y-8">
            {latest.map((gist) => {
              const type = gist.entry.type.toLowerCase();
              return (
                <li key={gist.id}>
                  <Link
                    href={`/${type}/${gist.slug}`}
                    className="group block space-y-1"
                  >
                    <p className="prose-muted text-xs uppercase tracking-wide">
                      {gist.entry.type} &middot; {formatDate(gist.created_at)}
                    </p>
                    <h3 className="prose-h3 transition-colors group-hover:text-muted-foreground">
                      {gist.entry.title}
                    </h3>
                    {gist.entry.description ? (
                      <p className="prose-muted line-clamp-2">
                        {gist.entry.description}
                      </p>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
