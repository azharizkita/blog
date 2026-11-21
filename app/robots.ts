import type { MetadataRoute } from "next";

import { config } from "@/lib/config";

/** AI crawlers and agents that read robots.txt by their own name. */
const AI_CRAWLERS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
  "Bytespider",
  "Amazonbot",
  "Meta-ExternalAgent",
  "meta-externalfetcher",
  "cohere-ai",
  "Diffbot",
  "YouBot",
  "MistralAI-User",
  "DuckAssistBot",
  "AI2Bot",
  "Timpibot",
  "ImagesiftBot",
];

export default function robots(): MetadataRoute.Robots {
  // /23 (and its song) is a private page: no crawler of any kind. AI
  // crawlers are named as well, for the ones that only read their own group.
  const privatePaths = ["/23", "/audio/"];
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // The dev-only editor 404s in production, but keep crawlers away
        // from the paths entirely in case a deployment ever serves them.
        disallow: ["/editor", ...privatePaths],
      },
      { userAgent: AI_CRAWLERS, disallow: privatePaths },
    ],
    sitemap: `${config.site.url}/sitemap.xml`,
    host: config.site.url,
  };
}
