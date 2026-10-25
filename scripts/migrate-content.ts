// One-off: rewrite MDX-era post syntax into TanStack Markdown in the `posts` table.
// Usage: node --env-file=<env> scripts/migrate-content.ts                       (dry run)
//        node --env-file=<env> scripts/migrate-content.ts --apply --confirm-host=<host>
import { neon } from "@neondatabase/serverless";
import { convertLegacyMarkdown } from "../lib/markdown/legacy.ts";
import { assertChangedSet, lineDiff, readingTime } from "./migrate-content-lib.ts";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const confirmHost = args.find((a) => a.startsWith("--confirm-host="))?.slice("--confirm-host=".length);

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set (pass --env-file=<env>).");
  process.exit(1);
}
const host = new URL(url).host;
console.log(`Database host: ${host}`);
console.log(apply ? "Mode: APPLY" : "Mode: dry run (no writes)");
if (apply && confirmHost !== host) {
  console.error(`--apply requires --confirm-host=${host}`);
  process.exit(1);
}

const sql = neon(url);
type Row = { id: string; slug: string; title: string; content: string; reading_time_minutes: number | null };
const rows = (await sql`select id, slug, title, content, reading_time_minutes from posts order by slug`) as Row[];

const changes: { row: Row; content: string }[] = [];
const problems: string[] = [];
for (const row of rows) {
  const res = convertLegacyMarkdown(row.content);
  for (const line of res.unconvertible) problems.push(`${row.slug}: ${line}`);
  if (res.changed && res.content !== row.content) changes.push({ row, content: res.content });
}

if (problems.length) {
  console.error("Unconvertible lines found:\n" + problems.join("\n"));
  process.exit(1);
}
const setError = assertChangedSet(changes.map((c) => c.row.slug));
if (setError) {
  console.error(`Abort: ${setError}`);
  process.exit(1);
}

console.log(`${rows.length} posts scanned, ${changes.length} to convert`);
if (!changes.length) process.exit(0);

for (const { row, content } of changes) {
  const minutes = readingTime(content);
  const rt = minutes !== row.reading_time_minutes ? ` (reading_time ${row.reading_time_minutes} -> ${minutes})` : "";
  console.log(`\n=== ${row.slug}${rt} ===\n${lineDiff(row.content, content)}`);
}

if (!apply) {
  console.log("\nDry run only. Re-run with --apply --confirm-host=" + host + " to write.");
  process.exit(0);
}

for (const { row, content } of changes) {
  const minutes = readingTime(content);
  const queries = [
    sql`insert into post_revisions (post_id, title, content) values (${row.id}, ${row.title}, ${row.content})`,
    sql`update posts set content = ${content} where id = ${row.id}`,
  ];
  if (minutes !== row.reading_time_minutes)
    queries.push(sql`update posts set reading_time_minutes = ${minutes} where id = ${row.id}`);
  await sql.transaction(queries);
  console.log(`applied ${row.slug}`);
}
console.log("Done.");
