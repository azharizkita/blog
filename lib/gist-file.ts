/**
 * Article content lives in one file per gist. New saves write `index.mdx`
 * (articles are compiled as MDX and may contain registered JSX components —
 * see components/article-content/mdx-components.tsx); `index.md` remains a
 * read fallback for anything not yet migrated.
 */
export const CONTENT_FILENAME = "index.mdx";
export const LEGACY_CONTENT_FILENAME = "index.md";

interface GistFileLike {
  content?: string;
  raw_url?: string;
}

/** Picks the gist's content file, preferring `.mdx` over the `.md` fallback. */
export function getContentFile<File extends GistFileLike>(
  files: Record<string, File | null | undefined> | undefined | null,
): { filename: string; file: File } | null {
  for (const filename of [CONTENT_FILENAME, LEGACY_CONTENT_FILENAME]) {
    const file = files?.[filename];
    if (file) return { filename, file };
  }
  return null;
}
