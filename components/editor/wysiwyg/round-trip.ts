/**
 * Canonicalizes markdown so that parse→serialize through the WYSIWYG editor
 * can be compared against the original without false alarms from
 * whitespace/bullet-marker style. Conservative on purpose: a false MISMATCH
 * only costs a source-mode fallback; a false MATCH silently rewrites a gist.
 */
export function normalizeMarkdown(md: string): string {
  return md
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/^([ \t]*)[*+] /gm, "$1- ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function roundTrips(original: string, serialized: string): boolean {
  return normalizeMarkdown(original) === normalizeMarkdown(serialized);
}
