export interface CoverImage {
  src: string;
  alt: string;
  width: number;
  height: number;
}

const IMAGE_PATTERN = /!\[([^\]]*)\]\(([^)\s]+)\)/g;
const DIMENSIONS_PATTERN = /^(\d+)x(\d+)$/;

/**
 * Finds the article's designated cover image: the first markdown image whose
 * alt carries a "cover" segment in the site's pipe convention, e.g.
 * "the park|1179x1298|cover" (see lib/get-image-size.ts for the base
 * "alt|WxH" format — extra segments are ignored by that parser, so the
 * marker is invisible to article rendering). The editor's image UI writes
 * and clears the marker; surfaces like the featured carousel use the result
 * and fall back to the generated OG card when there is none.
 */
export default function extractCoverImage(markdown: string): CoverImage | null {
  for (const match of markdown.matchAll(IMAGE_PATTERN)) {
    const [, rawAlt, src] = match;
    const segments = rawAlt.split("|");
    const markers = segments.slice(1).map((segment) => segment.trim());
    if (!markers.includes("cover")) continue;

    const dimensions = markers
      .map((segment) => DIMENSIONS_PATTERN.exec(segment))
      .find((result) => result !== null);

    return {
      src,
      alt: (segments[0] ?? "").trim(),
      width: dimensions ? Number(dimensions[1]) : 1200,
      height: dimensions ? Number(dimensions[2]) : 630,
    };
  }
  return null;
}
