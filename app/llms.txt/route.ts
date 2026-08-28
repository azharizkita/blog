import { getGistList } from "@/repositories/gist";
import { config } from "@/lib/config";
import { getSiteCopy } from "@/repositories/settings";

// Order the sections the same way the nav does.
const TYPE_ORDER = ["Blog", "Poem", "Sharing", "Literature"] as const;

// Collapse whitespace/newlines so a description stays on one markdown line.
function oneLine(value?: string | null) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

/**
 * /llms.txt — a curated, plain-markdown index of the site for LLMs and
 * browsing agents (see https://llmstxt.org). Lets an agent grab the whole
 * catalog in a single cheap fetch instead of parsing each HTML page.
 */
export async function GET() {
  const { siteDescription } = await getSiteCopy();
  const lines: string[] = [
    `# ${config.site.name}`,
    "",
    `> ${oneLine(siteDescription)}`,
    "",
  ];

  try {
    const articles = await getGistList("articles");

    for (const type of TYPE_ORDER) {
      const entries = articles.filter((gist) => gist.entry.type === type);
      if (entries.length === 0) continue;

      lines.push(`## ${type}`, "");
      for (const gist of entries) {
        const url = `${config.site.url}/${type.toLowerCase()}/${gist.slug}`;
        const description = oneLine(gist.entry.description);
        lines.push(`- [${gist.entry.title}](${url})${description ? `: ${description}` : ""}`);
      }
      lines.push("");
    }
  } catch {
    lines.push("_Content index is temporarily unavailable._", "");
  }

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=43200",
    },
  });
}
