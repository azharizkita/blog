import { getGistList } from "@/repositories/gist";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format-date";
import Link from "next/link";

/**
 * Async server component: fetches the gist list on the server and renders it
 * as the email-style list. Meant to be wrapped in <Suspense> so the shell
 * (nav rail + list header) streams in before the network call resolves.
 */
export async function MailList() {
  const gists = await getGistList();

  if (gists.length === 0) {
    return <div className="prose-muted p-4">No entries yet.</div>;
  }

  return (
    <>
      {gists.map((gist) => {
        const type = gist.entry.type.toLowerCase();
        const slug = gist.slug;

        return (
          <Link
            href={`/${type}/${slug}`}
            key={gist.id}
            className="flex flex-col items-start gap-2 border-b p-4 text-sm leading-tight whitespace-nowrap last:border-b-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <div className="flex w-full justify-between">
              <span>{gist.entry.type}</span>
              <span className="prose-muted text-xs">
                {formatDate(gist.updated_at ?? gist.created_at)}
              </span>
            </div>
            <span className="prose-small leading-tight line-clamp-1 w-65 whitespace-break-spaces">
              {gist.entry.title}
            </span>
            {gist.entry.description ? (
              <span className="prose-muted line-clamp-2 w-65 text-xs whitespace-break-spaces">
                {gist.entry.description}
              </span>
            ) : null}
          </Link>
        );
      })}
    </>
  );
}

/** Fallback shown while <MailList> streams. Mirrors the row layout. */
export function MailListSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="flex flex-col items-start gap-2 border-b p-4 last:border-b-0"
        >
          <div className="flex w-full items-center gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="ml-auto h-3 w-16" />
          </div>
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-60" />
        </div>
      ))}
    </>
  );
}
