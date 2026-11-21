import { NextResponse, type NextRequest } from "next/server";

/**
 * Keeps bots off the private /23 page (a birthday page), its photos and its
 * song: search crawlers, AI crawlers and agents, scrapers and headless
 * browsers get a plain 404, as if the page didn't exist. Link-preview
 * fetchers (WhatsApp, iMessage, Telegram…) are let through, so a shared
 * link still shows its card; the card carries only the page's neutral title
 * and the "23" image.
 *
 * The original photo files under /23/ are exempt (see below); the page,
 * the photos as the browser actually loads them (/_next/image) and the
 * song are not.
 *
 * This only catches clients that say what they are. The page is also
 * noindex/noai in its meta tags and headers, and disallowed in robots.txt.
 */

// Link previews in chat apps: allowed.
const PREVIEW =
  /whatsapp|facebookexternalhit|facebot|twitterbot|telegrambot|slackbot-linkexpanding|discordbot|linebot|skypeuripreview|iframely/i;

// Anything that identifies as a bot, crawler, AI agent or script.
const BOT =
  /bot\b|bot\/|crawl|spider|slurp|scrap|fetch|archiv|preview|headless|lighthouse|python|curl|wget|httpx|axios|node-fetch|undici|go-http|java\/|okhttp|libwww|perl|ruby|php|scrapy|playwright|puppeteer|selenium|phantom|gptbot|chatgpt|openai|oai-searchbot|claude|anthropic|perplexity|cohere|ccbot|bytespider|amazonbot|applebot|meta-external|diffbot|youbot|mistral|duckassist|ai2bot|timpibot|imagesift|google-extended|googleother|bingpreview|petalbot|semrush|ahrefs|mj12|dotbot|yandex|baidu/i;

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  // The image optimizer only matters when it's serving one of the page's
  // photos.
  if (pathname === "/_next/image") {
    const url = searchParams.get("url") ?? "";
    if (!/^\/(23|audio)\//.test(url)) return NextResponse.next();
  }

  // The original photo files are left alone: the image optimizer fetches
  // them from the server itself (with no user agent), and their paths only
  // appear inside the page, which bots never get. They still carry the
  // noindex/noai header (next.config.ts) and are disallowed in robots.txt.
  if (/^\/23\/.+\.(jpe?g|png|webp|avif)$/i.test(pathname)) {
    return NextResponse.next();
  }

  const agent = request.headers.get("user-agent") ?? "";
  const isPreview = PREVIEW.test(agent);
  // Previews may read the page itself (its title and card image), nothing
  // else.
  const previewAllowed =
    isPreview && (pathname === "/23" || pathname === "/23/opengraph-image.jpg");

  if (
    !agent ||
    (BOT.test(agent) && !previewAllowed) ||
    (isPreview && !previewAllowed)
  ) {
    return new NextResponse("Not found", {
      status: 404,
      headers: {
        "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet, noai",
        "Cache-Control": "no-store",
      },
    });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/23", "/23/:path*", "/audio/:path*", "/_next/image"],
};
