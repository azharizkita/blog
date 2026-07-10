import { getGistList } from "@/repositories/gist";
import { config } from "@/lib/config";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** /feed.xml — RSS 2.0 feed of every article, newest first. */
export async function GET() {
  let items = "";

  try {
    const articles = await getGistList("articles");
    const sorted = [...articles].sort(
      (a, b) =>
        new Date(b.created_at ?? 0).getTime() -
        new Date(a.created_at ?? 0).getTime(),
    );

    items = sorted
      .map((gist) => {
        const link = `${config.site.url}/${gist.entry.type.toLowerCase()}/${gist.slug}`;
        const pubDate = gist.created_at
          ? new Date(gist.created_at).toUTCString()
          : "";
        return [
          "    <item>",
          `      <title>${escapeXml(gist.entry.title)}</title>`,
          `      <link>${escapeXml(link)}</link>`,
          `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
          `      <category>${escapeXml(gist.entry.type)}</category>`,
          gist.entry.description
            ? `      <description>${escapeXml(gist.entry.description)}</description>`
            : "",
          pubDate ? `      <pubDate>${pubDate}</pubDate>` : "",
          "    </item>",
        ]
          .filter(Boolean)
          .join("\n");
      })
      .join("\n");
  } catch {
    items = "";
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(config.site.name)}</title>
    <link>${config.site.url}</link>
    <description>${escapeXml(config.site.description)}</description>
    <language>en</language>
    <atom:link href="${config.site.url}/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=43200",
    },
  });
}
