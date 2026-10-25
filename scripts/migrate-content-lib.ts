// Pure helpers for scripts/migrate-content.ts (kept separate so tests can import them).

export const EXPECTED_CHANGED = [
  "21-guns",
  "hiduplah-dengan-tenang",
  "the-astral-omen",
  "the-weight-of-silence",
] as const;

const WORDS_PER_MINUTE = 275; // mirrors lib/reading-time.ts (Ghost's convention)

/** Whole minutes, never below 1. Same formula as lib/reading-time.ts. */
export function readingTime(markdown: string): number {
  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

/** Returns an error message if the changed slugs are not exactly the expected set, else null. */
export function assertChangedSet(changed: string[]): string | null {
  if (changed.length === 0) return null;
  const got = [...new Set(changed)].sort();
  const want: string[] = [...EXPECTED_CHANGED].sort();
  const missing = want.filter((s) => !got.includes(s));
  const extra = got.filter((s) => !want.includes(s));
  if (!missing.length && !extra.length && got.length === changed.length) return null;
  return `changed set mismatch; missing: [${missing.join(", ")}], unexpected: [${extra.join(", ")}]`;
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
