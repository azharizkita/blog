// Run: node --env-file=.env.local scripts/export-fixtures.ts
// Read-only export of every published post's exact content to tests/fixtures/posts.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL ?? "");
const dir = path.resolve(import.meta.dirname, "../tests/fixtures/posts");

const rows = (await sql.query(
  `select p.id, p.slug, p.content, t.name as tag_name
   from posts p
   join posts_tags pt on pt.post_id = p.id and pt.sort_order = 0
   join tags t on t.id = pt.tag_id
   where p.status = 'published'
   order by p.slug`,
)) as { id: string; slug: string; content: string; tag_name: string }[];

mkdirSync(dir, { recursive: true });
const index: { slug: string; type: string; url: string }[] = [];
for (const r of rows) {
  writeFileSync(path.join(dir, `${r.slug}.md`), r.content);
  // Beep pages 404 (app/[type]/[slug]/page.tsx), so they have no public URL.
  if (r.tag_name === "Beep") continue;
  const type = r.tag_name.toLowerCase();
  index.push({ slug: r.slug, type, url: `/${type}/${r.slug}` });
}
writeFileSync(path.join(dir, "index.json"), JSON.stringify(index, null, 2) + "\n");
console.log(`${rows.length} fixtures, ${index.length} public URLs`);
