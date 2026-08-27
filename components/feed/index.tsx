import Link from "next/link";
import { ChevronRight, Star } from "lucide-react";
import type { GistList } from "@/repositories/gist";
import { FeedReveal } from "./feed-reveal";

export function FeedRow({ gist }: { gist: GistList[number] }) {
  const date = gist.created_at ? new Date(gist.created_at) : null;
  const type = gist.entry.type.toLowerCase();
  return (
    // overflow-x-clip: the hover chevron parks 24px PAST the row's right edge
    // (translate-x-6); unclipped, that widens the page's scrollable area and
    // makes every feed page horizontally scrollable on mobile, where the row
    // spans the full viewport. clip (not hidden) avoids creating a scroll
    // container, so the slide-in still animates.
    <article className="group relative flex items-center gap-4 overflow-x-clip py-5">
      {date && (
        <time
          dateTime={date.toISOString().slice(0, 10)}
          className="w-10 flex-none text-center font-extrabold text-primary"
        >
          <span className="block text-lg leading-none">
            {String(date.getUTCDate()).padStart(2, "0")}
          </span>
          <span className="block text-[10px] tracking-wide uppercase">
            {date.toLocaleString("en-US", { month: "short", timeZone: "UTC" })}
          </span>
        </time>
      )}
      <h2 className="min-w-0 flex-1 truncate font-semibold transition-[opacity] group-hover:opacity-80">
        {gist.entry.title}
      </h2>
      <div className="flex flex-none items-center gap-3 transition-transform group-hover:-translate-x-4">
        {gist.entry.featured && (
          <Star
            role="img"
            aria-label="Featured"
            className="size-3.5 fill-primary text-primary"
          />
        )}
        {gist.readingTimeMinutes != null && (
          <span className="prose-muted text-xs whitespace-nowrap">
            {gist.readingTimeMinutes} min read
          </span>
        )}
      </div>
      <ChevronRight
        aria-hidden
        className="absolute right-0 size-4 translate-x-6 text-muted-foreground opacity-0 transition-[transform,opacity] group-hover:translate-x-0 group-hover:opacity-100"
      />
      <Link
        href={`/${type}/${gist.slug}`}
        aria-label={gist.entry.title}
        className="absolute inset-0"
      />
    </article>
  );
}

export function Feed({ gists, pageSize = 5 }: { gists: GistList; pageSize?: number }) {
  if (gists.length === 0) return <p className="prose-muted">No entries yet.</p>;
  return (
    <FeedReveal pageSize={pageSize} total={gists.length}>
      {gists.map((gist) => (
        <FeedRow key={gist.id} gist={gist} />
      ))}
    </FeedReveal>
  );
}
