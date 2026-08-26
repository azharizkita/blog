/**
 * The site's convention makes the document's leading "## " heading the
 * article title (ArticleContent promotes ## to the page's h1). The editor
 * derives the gist's metadata title from it instead of keeping a separate
 * field — this reads it: the first line must be a level-2 ATX heading.
 */
export default function extractTitle(markdown: string): string {
  const firstLine = markdown.trimStart().split("\n", 1)[0] ?? "";
  const match = /^##\s+(.+)$/.exec(firstLine);
  return match?.[1]?.trim() ?? "";
}
