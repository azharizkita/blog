// Pure helpers for scripts/migrate-content.ts (kept separate so tests can import them).

import { LEGACY_POST_SLUGS } from "../lib/markdown/legacy-shim.ts";

/** Posts the old editor's TrailingNode left ending in an empty `#` heading. */
export const EMPTY_HEADING_SLUGS: readonly string[] = ["hiduplah-dengan-tenang", "parking-lot"];

/**
 * The only slugs this migration may change: the MDX-era posts (shared with
 * the read shim) and the posts with a trailing empty heading.
 */
export const EXPECTED_CHANGED: readonly string[] = [
  ...new Set([...LEGACY_POST_SLUGS, ...EMPTY_HEADING_SLUGS]),
].sort();

/** Drops empty ATX headings (`#`, `## `…) at the very end of a post, with the blank lines before them. */
export function stripTrailingEmptyHeadings(markdown: string): string {
  const lines = markdown.split("\n");
  let end = lines.length;
  while (end > 0 && !lines[end - 1].trim()) end--;
  if (end === 0 || !/^#{1,6}[ \t]*$/.test(lines[end - 1])) return markdown;
  while (end > 0 && (!lines[end - 1].trim() || /^#{1,6}[ \t]*$/.test(lines[end - 1]))) end--;
  return lines.slice(0, end).join("\n");
}

const WORDS_PER_MINUTE = 275; // mirrors lib/reading-time.ts (Ghost's convention)

/** Whole minutes, never below 1. Same formula as lib/reading-time.ts. */
export function readingTime(markdown: string): number {
  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

/**
 * Returns an error message if a changed slug is outside the expected set or
 * repeated, else null. Any subset is fine: a legacy post saved from the new
 * editor is already converted.
 */
export function assertChangedSet(changed: string[]): string | null {
  const unexpected = [...new Set(changed.filter((s) => !EXPECTED_CHANGED.includes(s)))];
  const duplicates = changed.filter((s, i) => changed.indexOf(s) !== i);
  if (!unexpected.length && !duplicates.length) return null;
  return `changed set mismatch; unexpected: [${unexpected.join(", ")}], duplicates: [${[...new Set(duplicates)].join(", ")}]`;
}

/** Unified-style line diff (LCS) with `context` lines around each change. */
export function lineDiff(before: string, after: string, context = 2): string {
  const a = before.split("\n");
  const b = after.split("\n");
  const n = a.length;
  const m = b.length;
  const lcs: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
  const ops: { t: " " | "-" | "+"; s: string }[] = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) {
      ops.push({ t: " ", s: a[i] });
      i++;
      j++;
    }
    else if (i < n && (j === m || lcs[i + 1][j] >= lcs[i][j + 1])) ops.push({ t: "-", s: a[i++] });
    else ops.push({ t: "+", s: b[j++] });
  }
  const keep = new Array(ops.length).fill(false);
  ops.forEach((op, k) => {
    if (op.t === " ") return;
    for (let x = Math.max(0, k - context); x <= Math.min(ops.length - 1, k + context); x++) keep[x] = true;
  });
  const out: string[] = [];
  let gap = false;
  ops.forEach((op, k) => {
    if (!keep[k]) {
      gap = out.length > 0;
      return;
    }
    if (gap) out.push("  ...");
    gap = false;
    out.push(`${op.t} ${op.s}`);
  });
  return out.join("\n");
}

/** True only if both transaction statements (revision insert, update) each returned exactly one row. */
export function appliedExactlyOnce(results: unknown[]): boolean {
  return results.length === 2 && results.every((r) => Array.isArray(r) && r.length === 1);
}
