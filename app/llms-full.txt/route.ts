import { getGistDetails, getGistList } from "@/repositories/gist";
import { config } from "@/lib/config";
import { getContentFile } from "@/lib/gist-file";

function oneLine(value?: string | null) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

/**
 * /llms-full.txt — the whole catalog with full article bodies inlined, so an
 * agent can ingest everything in a single fetch (see https://llmstxt.org).
 * Heavier than /llms.txt since it reads each gist's markdown.
 */
export async function GET() {
  const parts: string[] = [
    `# ${config.site.name}`,
    "",
    `> ${oneLine(config.site.description)}`,
    "",
  ];

  try {
    const articles = await getGistList("articles");
    const sorted = [...articles].sort(
      (a, b) =>
        new Date(b.created_at ?? 0).getTime() -
        new Date(a.created_at ?? 0).getTime(),
    );

    for (const gist of sorted) {
      let content: string | undefined;
      try {
        const details = await getGistDetails(gist.slug);
        content = getContentFile(details?.files)?.file.content?.trim();
      } catch {
        content = undefined;
      }
      if (!content) continue;

      const url = `${config.site.url}/${gist.entry.type.toLowerCase()}/${gist.slug}`;
      parts.push(
        "---",
        "",
        `# ${gist.entry.title}`,
        "",
        `- Type: ${gist.entry.type}`,
        `- URL: ${url}`,
        "",
        content,
        "",
      );
    }
  } catch {
    parts.push("_Content is temporarily unavailable._", "");
  }

  return new Response(parts.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=43200",
    },
  });
}
