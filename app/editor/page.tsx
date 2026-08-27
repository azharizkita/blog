import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";
import { ChevronRight, Star } from "lucide-react";
import { RebuildButton } from "@/components/editor/rebuild-button";
import { buttonVariants } from "@/components/ui/button";
import { listAllGists } from "@/repositories/gist";
import { assertDevEditorPage } from "./dev-only";

export const metadata: Metadata = {
  title: "Editor",
  robots: { index: false, follow: false },
};

// Deliberately-uncached IO (listAllGists) runs outside Suspense here; opt
// this dev-only page out of instant-navigation validation instead of
// restructuring it around Suspense/`use cache`. See instant route segment
// config docs.
export const instant = false;

export default async function EditorPage() {
  assertDevEditorPage();

  // The editor list must always be fresh, so render at request time. This
  // also stops cacheComponents' prerender validation from walking into the
  // uncached Octokit call below (its retry jitter uses Math.random(), which
  // the prerender pass flags as a blocking-route error in the dev overlay).
  await connection();

  const gists = await listAllGists();
  // Same ordering (and calendar date) as the public feed: creation date.
  const sorted = [...gists].sort(
    (a, b) =>
      new Date(b.created_at ?? 0).getTime() -
      new Date(a.created_at ?? 0).getTime(),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Same tag-page header language as /[type] (#blog etc.). */}
        <h1 className="prose-h1">
          <span className="text-primary">#</span>editor
        </h1>
        <div className="flex items-center gap-2">
          <RebuildButton />
          <Link href="/editor/new" className={buttonVariants()}>
            New article
          </Link>
        </div>
      </div>

      {/* Dawn feed-row anatomy, mirroring components/feed/index.tsx: calendar
          block (creation date, same as the public feed), truncating title,
          star, status, hover chevron. Rows link into the editor instead of
          the public article. */}
      <div className="divide-y">
        {sorted.map((gist) => {
          const date = gist.created_at ? new Date(gist.created_at) : null;
          return (
            <article
              key={gist.id}
              className="group relative flex items-center gap-4 overflow-x-clip py-5"
            >
              {date && (
                <time
                  dateTime={date.toISOString().slice(0, 10)}
                  className="w-10 flex-none text-center font-extrabold text-primary"
                >
                  <span className="block text-lg leading-none">
                    {String(date.getUTCDate()).padStart(2, "0")}
                  </span>
                  <span className="block text-[10px] tracking-wide uppercase">
                    {date.toLocaleString("en-US", {
                      month: "short",
                      timeZone: "UTC",
                    })}
                  </span>
                </time>
              )}
              <div className="min-w-0 flex-1">
                <p className="prose-muted text-[10px] tracking-wide uppercase">
                  {gist.entry.type}
                </p>
                <h2 className="truncate font-semibold transition-[opacity] group-hover:opacity-80">
                  {gist.entry.title}
                </h2>
              </div>
              <div className="flex flex-none items-center gap-3 transition-transform group-hover:-translate-x-4">
                {gist.entry.featured && (
                  <Star
                    role="img"
                    aria-label="Featured"
                    className="size-3.5 fill-primary text-primary"
                  />
                )}
                <span className="prose-muted text-xs whitespace-nowrap">
                  {gist.public ? "Published" : "Draft"}
                </span>
              </div>
              <ChevronRight
                aria-hidden
                className="absolute right-0 size-4 translate-x-6 text-muted-foreground opacity-0 transition-[transform,opacity] group-hover:translate-x-0 group-hover:opacity-100"
              />
              <Link
                href={`/editor/${gist.id}`}
                aria-label={gist.entry.title}
                className="absolute inset-0"
              />
            </article>
          );
        })}
      </div>
    </div>
  );
}
