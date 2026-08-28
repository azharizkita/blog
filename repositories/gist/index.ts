import { neon } from "@neondatabase/serverless";
import { cacheLife, cacheTag } from "next/cache";
import { config } from "@/lib/config";
import composeEntry from "@/lib/compose-entry";
import type { ContentTopic } from "@/lib/content-types";
import extractCoverImage, {
  type CoverImage,
} from "@/lib/extract-cover-image";
import { CONTENT_FILENAME } from "@/lib/gist-file";
import getSlug from "@/lib/get-slug";
import parseEntry from "@/lib/parse-entry";
import readingTime from "@/lib/reading-time";

/**
 * Content repository, backed by Lakebase Postgres on Neon (schema.sql in
 * this folder; Ghost-style posts/tags/authors/revisions). The export
 * contract is the historical gist-shaped one — every consumer outside this
 * folder still sees octokit-ish rows with a composed `Type! - Title - …`
 * description, an `entry` parsed from it, and content under
 * files["index.mdx"] — so swapping the storage never touched them.
 *
 * Connections follow Neon practice: the app uses the pooled DATABASE_URL
 * via the HTTP driver (one-shot queries, ideal inside "use cache" scopes);
 * schema changes are applied out-of-band with the direct URL.
 */
const sql = neon(process.env.DATABASE_URL ?? "");

type PostRow = {
  id: string;
  title: string;
  slug: string;
  content: string;
  custom_excerpt: string | null;
  status: string;
  featured: boolean;
  language: string | null;
  feature_image: string | null;
  feature_image_alt: string | null;
  feature_image_width: number | null;
  feature_image_height: number | null;
  reading_time_minutes: number | null;
  created_at: string;
  updated_at: string;
  tag_name: string;
};

const POST_COLUMNS = `
  p.id, p.title, p.slug, p.content, p.custom_excerpt, p.status, p.featured,
  p.language, p.feature_image, p.feature_image_alt, p.feature_image_width,
  p.feature_image_height, p.reading_time_minutes,
  to_char(p.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
  to_char(p.updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as updated_at,
  t.name as tag_name
`;

const POST_JOINS = `
  from posts p
  join posts_tags pt on pt.post_id = p.id and pt.sort_order = 0
  join tags t on t.id = pt.tag_id
`;

/** Composes the historical description string, then parses it back with the
 * real parseEntry so `entry` semantics are identical to the gist era. */
function toDescription(row: PostRow): string {
  return composeEntry({
    type: row.tag_name as ContentTopic | "Beep",
    title: row.title,
    description: row.custom_excerpt ?? "",
    languageTag: row.language ?? undefined,
    featured: row.featured,
  });
}

function toListItem(row: PostRow) {
  const description = toDescription(row);
  const { title, ...restEntryData } = parseEntry(description);
  const coverImage: CoverImage | null = row.feature_image
    ? {
        src: row.feature_image,
        alt: row.feature_image_alt ?? "",
        width: row.feature_image_width ?? 1200,
        height: row.feature_image_height ?? 630,
      }
    : null;

  return {
    id: row.id,
    description,
    public: row.status === "published",
    created_at: row.created_at,
    updated_at: row.updated_at,
    entry: { title, ...restEntryData },
    slug: row.slug,
    readingTimeMinutes: row.reading_time_minutes,
    coverImage,
  };
}

function toGistShape(row: PostRow) {
  return {
    ...toListItem(row),
    files: {
      [CONTENT_FILENAME]: { filename: CONTENT_FILENAME, content: row.content },
    } as Record<string, { filename: string; content: string } | undefined>,
  };
}

type GistOptions = {
  topic: ContentTopic;
};

export const getGistList = async (
  type?: "beeps" | "articles",
  options?: GistOptions,
) => {
  "use cache";
  cacheLife({ revalidate: config.cache.defaultTime }); // 12h, matches old cache wrapper
  cacheTag("gists");

  const { topic } = options ?? {};

  const rows = (await sql.query(
    `select ${POST_COLUMNS} ${POST_JOINS}
     where p.status = 'published'
     order by p.created_at desc`,
  )) as PostRow[];

  const items = rows.map(toListItem);

  if (type === "beeps") {
    return items.filter((item) => item.entry.type === "Beep");
  }

  const articles = items.filter((item) => item.entry.type !== "Beep");

  if (!!topic) {
    return articles.filter((item) => item.entry.type === topic);
  }

  return articles;
};

export type GistList = Awaited<ReturnType<typeof getGistList>>;

export const getGistDetails = async (slug: string) => {
  "use cache";
  cacheLife({ revalidate: config.cache.defaultTime }); // 12h
  cacheTag("gists", `gist:${slug}`);

  const rows = (await sql.query(
    `select ${POST_COLUMNS} ${POST_JOINS}
     where p.status = 'published' and p.slug = $1
     limit 1`,
    [slug],
  )) as PostRow[];

  if (rows.length === 0) return null;
  return toGistShape(rows[0]);
};

// ---------------------------------------------------------------------------
// Editor-only helpers. Deliberately uncached: the editor must see fresh
// state, including drafts, which the published queries never return.

export const listAllGists = async () => {
  const rows = (await sql.query(
    `select ${POST_COLUMNS} ${POST_JOINS}
     order by p.created_at desc`,
  )) as PostRow[];
  return rows.map(toListItem);
};

export const getGistById = async (gistId: string) => {
  const rows = (await sql.query(
    `select ${POST_COLUMNS} ${POST_JOINS} where p.id = $1 limit 1`,
    [gistId],
  )) as PostRow[];
  if (rows.length === 0) {
    throw new Error(`Post not found: ${gistId}`);
  }
  return toGistShape(rows[0]);
};

/** Ghost-style slug dedupe: first taker keeps the plain slug, later
 * collisions get -2, -3, … (`excludeId` lets an update keep its own). */
async function resolveSlug(title: string, excludeId?: string): Promise<string> {
  const base = getSlug(title);
  const rows = (await sql.query(
    `select slug from posts where slug like $1 and ($2::text is null or id <> $2)`,
    [`${base}%`, excludeId ?? null],
  )) as { slug: string }[];
  const taken = new Set(rows.map((row) => row.slug));
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  return slug;
}

type WriteInput = { description: string; content: string };

function parseWrite(input: WriteInput) {
  const entry = parseEntry(input.description);
  const cover = extractCoverImage(input.content);
  return {
    entry,
    cover,
    minutes: readingTime(input.content),
    language: "languageTag" in entry ? entry.languageTag : null,
  };
}

async function tagIdFor(name: string): Promise<string> {
  const rows = (await sql.query(
    `insert into tags (name, slug) values ($1, $2)
     on conflict (slug) do update set updated_at = now()
     returning id`,
    [name, name.toLowerCase()],
  )) as { id: string }[];
  return rows[0].id;
}

export const createGist = async (args: {
  description: string;
  content: string;
  isPublic: boolean;
}) => {
  const { entry, cover, minutes, language } = parseWrite(args);
  const id = crypto.randomUUID().replaceAll("-", "");
  const slug = await resolveSlug(entry.title);

  await sql.query(
    `insert into posts (
       id, title, slug, content, custom_excerpt, status, featured, language,
       feature_image, feature_image_alt, feature_image_width,
       feature_image_height, reading_time_minutes, published_at
     ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,
               case when $6 = 'published' then now() else null end)`,
    [
      id,
      entry.title,
      slug,
      args.content,
      "description" in entry ? entry.description : null,
      args.isPublic ? "published" : "draft",
      entry.featured,
      language,
      cover?.src ?? null,
      cover?.alt ?? null,
      cover?.width ?? null,
      cover?.height ?? null,
      minutes,
    ],
  );
  const tagId = await tagIdFor(entry.type);
  await sql.query(
    `insert into posts_tags (post_id, tag_id, sort_order) values ($1, $2, 0)
     on conflict do nothing`,
    [id, tagId],
  );
  await sql.query(
    `insert into posts_authors (post_id, author_id, sort_order)
     select $1, id, 0 from authors order by created_at limit 1
     on conflict do nothing`,
    [id],
  );
  await sql.query(
    `insert into post_revisions (post_id, title, content) values ($1, $2, $3)`,
    [id, entry.title, args.content],
  );
  return { id };
};

export const updateGist = async (gistId: string, args: WriteInput) => {
  const { entry, cover, minutes, language } = parseWrite(args);
  const slug = await resolveSlug(entry.title, gistId);

  await sql.query(
    `update posts set
       title = $2, slug = $3, content = $4, custom_excerpt = $5,
       featured = $6, language = $7, feature_image = $8,
       feature_image_alt = $9, feature_image_width = $10,
       feature_image_height = $11, reading_time_minutes = $12,
       updated_at = now()
     where id = $1`,
    [
      gistId,
      entry.title,
      slug,
      args.content,
      "description" in entry ? entry.description : null,
      entry.featured,
      language,
      cover?.src ?? null,
      cover?.alt ?? null,
      cover?.width ?? null,
      cover?.height ?? null,
      minutes,
    ],
  );
  const tagId = await tagIdFor(entry.type);
  await sql.query(`delete from posts_tags where post_id = $1`, [gistId]);
  await sql.query(
    `insert into posts_tags (post_id, tag_id, sort_order) values ($1, $2, 0)`,
    [gistId, tagId],
  );
  await sql.query(
    `insert into post_revisions (post_id, title, content) values ($1, $2, $3)`,
    [gistId, entry.title, args.content],
  );
  return { id: gistId };
};

export const deleteGist = async (gistId: string) => {
  await sql.query(`delete from posts where id = $1`, [gistId]);
};
