import { neon } from "@neondatabase/serverless";
import { cacheLife, cacheTag } from "next/cache";
import { config } from "@/lib/config";

/**
 * Site-wide editable copy (Ghost-style settings + tags.description),
 * managed from the editor's Customize page. Falls back to the historical
 * hardcoded strings when a row is missing, so the site never renders
 * blank chrome.
 */
const sql = neon(process.env.DATABASE_URL ?? "");

export interface SiteCopy {
  siteDescription: string;
  footerNote: string;
  /** Keyed by tag slug (e.g. "blog"). */
  tagDescriptions: Record<string, string>;
}

const FALLBACKS = {
  siteDescription: config.site.description,
  footerNote:
    "This is a curated personal archive of my mind—from life updates, late-night thoughts, random realizations, or just rants about whatever's on my plate. It's not for everyone, but if you're here, maybe you'll find something that resonates.",
} as const;

async function readSiteCopy(): Promise<SiteCopy> {
  const [settingsRaw, tagsRaw] = await Promise.all([
    sql.query(`select key, value from settings`),
    sql.query(
      `select slug, description from tags where description is not null`,
    ),
  ]);
  const settings = settingsRaw as { key: string; value: string | null }[];
  const tags = tagsRaw as { slug: string; description: string }[];

  const byKey = Object.fromEntries(
    settings.map((row) => [row.key, row.value ?? ""]),
  );

  return {
    siteDescription: byKey.site_description || FALLBACKS.siteDescription,
    footerNote: byKey.footer_note || FALLBACKS.footerNote,
    tagDescriptions: Object.fromEntries(
      tags.map((row) => [row.slug, row.description]),
    ),
  };
}

/** Cached read for public pages; revalidated by the Customize save. */
export async function getSiteCopy(): Promise<SiteCopy> {
  "use cache";
  cacheLife({ revalidate: config.cache.defaultTime }); // 12h
  cacheTag("site-copy");
  return readSiteCopy();
}

/** Uncached read for the editor's Customize page. */
export async function getSiteCopyFresh(): Promise<SiteCopy> {
  return readSiteCopy();
}

export async function updateSiteCopy(input: SiteCopy): Promise<void> {
  const upsert = (key: string, value: string) =>
    sql.query(
      `insert into settings (key, value) values ($1, $2)
       on conflict (key) do update set value = $2, updated_at = now()`,
      [key, value],
    );
  await upsert("site_description", input.siteDescription);
  await upsert("footer_note", input.footerNote);
  for (const [slug, description] of Object.entries(input.tagDescriptions)) {
    await sql.query(
      `update tags set description = $1, updated_at = now() where slug = $2`,
      [description, slug],
    );
  }
}

/** Uncached tag list for the editor's Customize form. */
export async function listTags(): Promise<
  { slug: string; name: string; description: string | null }[]
> {
  const rows = await sql.query(
    `select slug, name, description from tags order by name`,
  );
  return rows as { slug: string; name: string; description: string | null }[];
}
