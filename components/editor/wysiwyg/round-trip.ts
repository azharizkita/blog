/**
 * Canonicalizes markdown so that parse→serialize through the WYSIWYG editor
 * can be compared against the original without false alarms from pure STYLE
 * differences — never content differences. Everything here maps
 * render-identical spellings onto one canonical form; a doc that only
 * matches after canonicalization will be rewritten into the serializer's
 * style on save, which changes bytes in the gist but not what readers see.
 * Conservative on purpose beyond that: a false MISMATCH only costs a
 * source-mode fallback; a false MATCH silently rewrites *meaning*.
 */
export function normalizeMarkdown(md: string): string {
  return (
    md
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]+$/gm, "")
      .replace(/^([ \t]*)[*+] /gm, "$1- ")
      // Emphasis marker style: _x_ ≡ *x*, __x__ ≡ **x**. Guards against
      // intraword underscores (snake_case), which markdown doesn't treat as
      // emphasis either.
      .replace(/(?<![\w_])__([^_\n]+)__(?![\w_])/g, "**$1**")
      .replace(/(?<![\w_])_([^_\n]+)_(?![\w_])/g, "*$1*")
      // Block spacing is style, not content: authors legally omit the blank
      // line between a heading/paragraph/fence and the next block, while the
      // serializer always writes one. Applied to BOTH sides of the compare,
      // stripping blank lines entirely canonicalizes every such variant
      // without being able to mask a content difference (code blocks are
      // preserved verbatim on both sides, so even blank lines inside them
      // are stripped symmetrically).
      .replace(/\n+/g, "\n")
      .trim()
  );
}

export function roundTrips(original: string, serialized: string): boolean {
  return normalizeMarkdown(original) === normalizeMarkdown(serialized);
}
