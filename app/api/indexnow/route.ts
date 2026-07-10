import { getIndexNowUrls, submitUrls } from "@/lib/indexnow";

/**
 * Notify IndexNow (Bing, Yandex, Seznam, Naver, ...) that content changed.
 * Protected by the INDEXNOW_SECRET env var — call it after publishing:
 *
 *   /api/indexnow?secret=SECRET            -> submit every site URL
 *   /api/indexnow?secret=SECRET&url=<abs>  -> submit a single URL
 *
 * Google does not use IndexNow; it's covered by Search Console instead.
 */
export async function GET(request: Request) {
  const secret = process.env.INDEXNOW_SECRET;
  const { searchParams } = new URL(request.url);

  if (!secret || searchParams.get("secret") !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const single = searchParams.get("url");

  try {
    const urls = single ? [single] : await getIndexNowUrls();
    const result = await submitUrls(urls);
    return Response.json({ ok: true, ...result, urls });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "failed" },
      { status: 502 },
    );
  }
}
