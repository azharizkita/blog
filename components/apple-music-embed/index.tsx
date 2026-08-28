"use client";

import { useTheme } from "next-themes";

/**
 * Apple Music embed for articles: takes any music.apple.com link (song,
 * album, or playlist — the share URL or the iframe's embed URL) and renders
 * Apple's official player via embed.music.apple.com. The iframe is
 * sandboxed per Apple's own embed snippet and lazy-loaded, so it costs
 * nothing until it scrolls near the viewport.
 *
 * The player follows the site theme via the embed's `theme` query param.
 * next-themes resolves the theme only after mount (the Mermaid pattern), so
 * the box renders empty at its final size first — the iframe then loads
 * once with the correct palette instead of flashing light-then-dark, and a
 * theme toggle re-renders it with the other palette.
 */

/** Normalizes a music.apple.com / embed.music.apple.com link to the embed
 * host; returns null for anything that isn't an Apple Music URL. */
export function toAppleMusicEmbedUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (
    parsed.hostname !== "music.apple.com" &&
    parsed.hostname !== "embed.music.apple.com"
  ) {
    return null;
  }
  parsed.hostname = "embed.music.apple.com";
  return parsed.toString();
}

/** A single song renders as Apple's compact player; albums and playlists
 * get the tall tracklist player (heights from Apple's embed snippets). */
function embedHeight(embedUrl: URL): number {
  const isSong =
    embedUrl.searchParams.has("i") || embedUrl.pathname.includes("/song/");
  return isSong ? 175 : 450;
}

export function AppleMusic({ url, title }: { url: string; title?: string }) {
  const { resolvedTheme } = useTheme();
  const embedUrl = toAppleMusicEmbedUrl(url);
  if (!embedUrl) return null;

  const themed = new URL(embedUrl);
  themed.searchParams.set("theme", resolvedTheme === "dark" ? "dark" : "light");

  return (
    <span
      className="mx-auto block w-full max-w-165"
      style={{ height: embedHeight(themed) }}
    >
      {resolvedTheme && (
        <iframe
          className="block size-full overflow-hidden rounded-lg border-0 bg-transparent"
          src={themed.toString()}
          title={title ?? "Apple Music player"}
          loading="lazy"
          allow="autoplay *; encrypted-media *; clipboard-write"
          sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"
        />
      )}
    </span>
  );
}
