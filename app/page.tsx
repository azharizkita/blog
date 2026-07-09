import Link from "next/link";
import { getGistList } from "@/repositories/gist";
import { formatDate } from "@/lib/format-date";
import ArticleContent from "@/components/article-content";

const LATEST_COUNT = 3;

const content = `This is a curated personal archive of my mind—from life updates, late-night thoughts, random realizations, or just rants about whatever's on my plate. It's not for everyone, but if you're here, maybe you'll find something that resonates.

Read, scroll, lurk, or leave—it's up to you.
`;

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

      <ArticleContent content={content} />
    </>
  );
}
