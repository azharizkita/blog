// Usage: node scripts/parity.ts capture|check   (needs `npm run dev` on :3000)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SNAP_DIR = path.join(ROOT, "tests/parity/snapshots");
const INDEX = path.join(ROOT, "tests/fixtures/posts/index.json");
const BASE = process.env.PARITY_BASE ?? "http://localhost:3000";

const decode = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, "&");

/** Outer HTML of <article id="article">, balancing nested <article> tags. */
function extractArticle(html: string): string {
  const start = html.search(/<article\b[^>]*\bid="article"/);
  if (start < 0) throw new Error('no <article id="article"> found');
  const tag = /<(\/?)article\b[^>]*>/g;
  tag.lastIndex = start;
  let depth = 0;
  for (let m; (m = tag.exec(html)); ) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return html.slice(start, m.index + m[0].length);
  }
  throw new Error("unterminated <article>");
}

export function normalize(html: string): string {
  let out = html.replace(/<link\b[^>]*\brel="preload"[^>]*>/g, "");
  // Code token markup may differ: reduce <pre> to its text content.
  out = out.replace(/<pre\b([^>]*)>([\s\S]*?)<\/pre>/g, (_m, attrs: string, inner: string) => {
    const text = decode(inner.replace(/<[^>]+>/g, ""))
      .split("\n")
      .map((l) => l.replace(/\s+$/, ""))
      .join("\n")
      .trim();
    const esc = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return `<pre${stripAttrs(attrs)}>${esc}</pre>`;
  });
  out = out.replace(/<code\b([^>]*)>/g, (_m, attrs: string) => `<code${stripAttrs(attrs)}>`);
  out = out.replace(
    /<figure\b([^>]*)>/g,
    (_m, attrs: string) => `<figure${attrs.replace(/\s+data-[\w-]+(?:="[^"]*")?/g, "")}>`,
  );
  // React text separators and whitespace right after a <br> are reader-invisible.
  out = out.replace(/(<br\s*\/?>)\s*(?:<!-- -->)?/g, "$1");
  out = out.replace(/>\s+</g, "><").trim();
  // A <br> closing a block is reader-invisible (the legacy converter drops it).
  return out.replace(/<br\s*\/?>(?=<\/(?:p|li|blockquote|td|th)>)/g, "");
}

function stripAttrs(attrs: string): string {
  return attrs.replace(/\s+(?:class|style|data-[\w-]+)(?:="[^"]*")?/g, "");
}

async function render(url: string): Promise<string> {
  const res = await fetch(BASE + url);
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return normalize(extractArticle(await res.text()));
}

const mode = process.argv[2];
if (mode !== "capture" && mode !== "check") {
  console.error("usage: parity.ts capture|check");
  process.exit(2);
}
const posts: { slug: string; url: string }[] = JSON.parse(readFileSync(INDEX, "utf8"));
mkdirSync(SNAP_DIR, { recursive: true });
let failed = 0;
for (const { slug, url } of posts) {
  const file = path.join(SNAP_DIR, `${slug}.html`);
  try {
    const actual = await render(url);
    if (mode === "capture") {
      writeFileSync(file, actual);
      console.log(`captured ${slug}`);
      continue;
    }
    const expected = normalize(readFileSync(file, "utf8"));
    if (actual === expected) continue;
    let i = 0;
    while (i < expected.length && expected[i] === actual[i]) i++;
    const from = Math.max(0, i - 100);
    console.error(`MISMATCH ${slug} at offset ${i}`);
    console.error(`  expected: ${JSON.stringify(expected.slice(from, i + 100))}`);
    console.error(`  actual:   ${JSON.stringify(actual.slice(from, i + 100))}`);
    failed++;
  } catch (e) {
    console.error(`ERROR ${slug}: ${(e as Error).message}`);
    failed++;
  }
}
if (mode === "check") console.log(failed ? `${failed} failing` : `all ${posts.length} match`);
process.exit(failed ? 1 : 0);
