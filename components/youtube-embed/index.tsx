"use client";

import { useState } from "react";
import { Play } from "lucide-react";

/**
 * Lite YouTube embed for articles: renders only the thumbnail (a plain img
 * from i.ytimg.com — no YouTube JS, no iframe) until the reader clicks,
 * then swaps in the privacy-enhanced youtube-nocookie player. Keeps
 * article pages free of third-party payloads by default.
 */
export function YouTube({ id, title }: { id: string; title?: string }) {
  const [playing, setPlaying] = useState(false);
  const label = title ?? "YouTube video";

  return (
    <div className="relative aspect-video overflow-hidden rounded-lg border bg-muted">
      {playing ? (
        <iframe
          className="absolute inset-0 size-full"
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1`}
          title={label}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          aria-label={`Play: ${label}`}
          onClick={() => setPlaying(true)}
          className="group absolute inset-0"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-opacity group-hover:opacity-80"
          />
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid size-14 place-items-center rounded-full bg-background/80 backdrop-blur transition-transform group-hover:scale-105">
              <Play aria-hidden className="ml-0.5 size-6 fill-current" />
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
