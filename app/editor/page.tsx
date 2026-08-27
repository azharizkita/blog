import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";
import { RebuildButton } from "@/components/editor/rebuild-button";
import { buttonVariants } from "@/components/ui/button";
import { formatDate } from "@/lib/format-date";
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
  const sorted = [...gists].sort(
    (a, b) =>
      new Date(b.updated_at ?? 0).getTime() -
      new Date(a.updated_at ?? 0).getTime(),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="prose-h1">Editor</h1>
        <div className="flex items-center gap-2">
          <RebuildButton />
          <Link href="/editor/new" className={buttonVariants()}>
            New article
          </Link>
        </div>
      </div>

      <ul className="divide-y">
        {sorted.map((gist) => (
          <li key={gist.id}>
            <Link
              href={`/editor/${gist.id}`}
              className="group flex items-baseline justify-between gap-4 py-3"
            >
              <span className="space-x-2">
                <span className="prose-muted text-xs tracking-wide uppercase">
                  {gist.entry.type}
                </span>
                <span className="font-medium transition-colors group-hover:text-muted-foreground">
                  {gist.entry.title}
                </span>
              </span>
              <span className="prose-muted text-xs whitespace-nowrap">
                {gist.public ? "Published" : "Draft"} ·{" "}
                {formatDate(gist.updated_at)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
